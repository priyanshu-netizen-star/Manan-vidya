import { redirect } from "next/navigation";
import { JsonForm } from "@/components/forms";
import { Badge, Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { MAINT_FLOW, MAINT_LABEL, type MaintStatus } from "@/lib/workflows";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const user = await requirePageUser();
  const warden = can(user.role, "hostel.manage");
  if (!warden && user.role !== "student") redirect("/app?denied=1");
  const db = await getDb();
  const ownRoom = !warden && user.studentId
    ? await db.one<{ room_id: number; room_no: string }>(
        "SELECT r.id AS room_id, r.room_no FROM bed_allocations ba JOIN hostel_beds b ON b.id = ba.bed_id JOIN hostel_rooms r ON r.id = b.room_id WHERE ba.student_id = $1 AND ba.to_date IS NULL",
        [user.studentId],
      )
    : null;
  const rows = await db.query<{ id: number; room_no: string | null; block: string | null; category: string; description: string; priority: string; status: MaintStatus; assigned_to: string | null; raised_by: string | null; created_at: string }>(
    `SELECT m.id, r.room_no, r.block, m.category, m.description, m.priority, m.status, m.assigned_to, u.name AS raised_by, m.created_at
       FROM maintenance_requests m LEFT JOIN hostel_rooms r ON r.id = m.room_id LEFT JOIN users u ON u.id = m.raised_by
      WHERE ($1::int IS NULL OR m.room_id = $1) ORDER BY (m.status IN ('open','in_progress')) DESC, (m.priority = 'urgent') DESC, m.created_at DESC`,
    [warden ? null : (ownRoom?.room_id ?? 0)],
  );
  const rooms = warden ? await db.query<{ id: number; block: string; room_no: string }>("SELECT id, block, room_no FROM hostel_rooms ORDER BY block, room_no") : [];
  return (
    <div>
      <PageHeader eyebrow="Hostel" title="Maintenance requests" description={warden ? "Track repairs from report to resolution." : "Report a problem in your room. The warden will arrange the repair."} />
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-3">
          {rows.length ? rows.map((m) => (
            <article key={m.id} className="card card-pad">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold flex-1">{m.room_no ?? "—"} <span className="text-sm text-muted font-normal">{m.block}</span></h2>
                <Badge>{m.category}</Badge>
                {m.priority === "urgent" && <Badge tone="bad">Urgent</Badge>}
                <StatusBadge status={m.status} label={MAINT_LABEL[m.status]} />
              </div>
              <p className="text-sm mt-1.5">{m.description}</p>
              <p className="text-xs text-muted mt-1.5">Raised by {m.raised_by ?? "—"} · {fmtDateTime(m.created_at)}{m.assigned_to ? ` · with ${m.assigned_to}` : ""}</p>
              {warden && MAINT_FLOW[m.status].length > 0 && (
                <JsonForm endpoint={`/api/hostel/maintenance/${m.id}`} method="PATCH" className="mt-3 flex flex-wrap gap-2 items-center" submitLabel="Update" successMessage="Updated.">
                  <label className="sr-only" htmlFor={`mt-${m.id}`}>Status</label>
                  <select id={`mt-${m.id}`} name="to" className="select !w-auto">{MAINT_FLOW[m.status].map((s) => <option key={s} value={s}>{MAINT_LABEL[s]}</option>)}</select>
                  <label className="sr-only" htmlFor={`ma-${m.id}`}>Assigned to</label>
                  <input id={`ma-${m.id}`} name="assignedTo" className="input !w-44" placeholder="Assigned to" defaultValue={m.assigned_to ?? ""} />
                  <label className="sr-only" htmlFor={`mn-${m.id}`}>Note</label>
                  <input id={`mn-${m.id}`} name="note" className="input !w-44" placeholder="Note" />
                </JsonForm>
              )}
            </article>
          )) : <div className="card"><EmptyState title="No maintenance requests" /></div>}
        </div>
        <Card title="Report a problem">
          {!warden && !ownRoom ? (
            <p className="text-sm text-muted">You do not have a hostel room allocated.</p>
          ) : (
            <JsonForm endpoint="/api/hostel/maintenance" submitLabel="Submit" successMessage="Request raised." resetOnSuccess>
              {warden ? (
                <Field label="Room" htmlFor="mr-room"><select id="mr-room" name="roomId" className="select">{rooms.map((r) => <option key={r.id} value={r.id}>{r.block} · {r.room_no}</option>)}</select></Field>
              ) : (
                <p className="text-sm">Room <strong>{ownRoom?.room_no}</strong></p>
              )}
              <Field label="Category" htmlFor="mr-cat">
                <select id="mr-cat" name="category" className="select">{["electrical", "plumbing", "furniture", "cleaning", "other"].map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </Field>
              <Field label="What is the problem?" htmlFor="mr-desc"><textarea id="mr-desc" name="description" className="textarea" rows={3} required minLength={5} /></Field>
              <Field label="Priority" htmlFor="mr-pri"><select id="mr-pri" name="priority" className="select" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent (safety risk)</option></select></Field>
            </JsonForm>
          )}
        </Card>
      </div>
    </div>
  );
}
