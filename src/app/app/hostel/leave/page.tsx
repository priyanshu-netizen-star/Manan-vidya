import { ActionButton, JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { can } from "@/lib/rbac";
import { LEAVE_FLOW, LEAVE_LABEL, type LeaveStatus } from "@/lib/workflows";

export const metadata = { title: "Leave & outpass" };

const ACTION_LABEL: Partial<Record<LeaveStatus, string>> = { approved: "Approve", rejected: "Reject", checked_out: "Check out", returned: "Mark returned", cancelled: "Cancel" };

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireAnyPermission("hostel.manage", "hostel.request");
  const warden = can(user.role, "hostel.manage");
  const sp = await searchParams;
  const filter = sp.status === "all" ? "all" : "open";
  const db = await getDb();
  const rows = await db.query<{
    id: number; student_id: number; name: string; class_name: string; kind: string; depart_at: string; return_at: string; reason: string; destination: string;
    escort_name: string; status: LeaveStatus; decision_note: string | null; requester: string | null; decider: string | null; created_at: string;
  }>(
    `SELECT l.id, l.student_id, s.name, c.name AS class_name, l.kind, l.depart_at, l.return_at, l.reason, l.destination, l.escort_name, l.status,
            l.decision_note, r.name AS requester, d.name AS decider, l.created_at
       FROM leave_requests l JOIN students s ON s.id = l.student_id JOIN classes c ON c.id = s.class_id
       LEFT JOIN users r ON r.id = l.requested_by LEFT JOIN users d ON d.id = l.decided_by
      WHERE ($1::int IS NULL OR l.student_id = $1) AND ($2 = 'all' OR l.status IN ('pending','approved','checked_out'))
      ORDER BY (l.status = 'pending') DESC, l.depart_at DESC LIMIT 200`,
    [warden ? null : (user.studentId ?? 0), warden ? filter : "all"],
  );
  const boarders = warden
    ? await db.query<{ id: number; name: string; class_name: string }>("SELECT s.id, s.name, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.is_boarder AND s.status = 'active' ORDER BY s.name")
    : [];
  const child = !warden && user.studentId ? await db.one<{ is_boarder: boolean; name: string }>("SELECT is_boarder, name FROM students WHERE id = $1", [user.studentId]) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Hostel"
        title="Leave and outpass"
        description={warden ? "Decide requests, record check-out and return. Every decision is recorded with your name." : "Request leave or an outpass for your child. The warden decides every request."}
      />
      {warden && (
        <div className="flex gap-1.5 mb-4">
          <a href="?status=open" className={`btn btn-sm ${filter === "open" ? "btn-primary" : "btn-secondary"}`}>Open</a>
          <a href="?status=all" className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-secondary"}`}>All</a>
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-3">
          {rows.length ? rows.map((r) => {
            const next = warden ? LEAVE_FLOW[r.status] : r.status === "pending" ? (["cancelled"] as LeaveStatus[]) : [];
            return (
              <article key={r.id} className="card card-pad">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold flex-1">{r.name} <span className="text-sm text-muted font-normal">· {r.class_name}</span></h2>
                  <span className="badge capitalize">{r.kind}</span>
                  <StatusBadge status={r.status} label={LEAVE_LABEL[r.status]} />
                </div>
                <dl className="grid sm:grid-cols-2 gap-x-5 gap-y-1 text-sm mt-2">
                  <div><dt className="inline text-muted">Leaves: </dt><dd className="inline">{fmtDateTime(r.depart_at)}</dd></div>
                  <div><dt className="inline text-muted">Returns: </dt><dd className="inline">{fmtDateTime(r.return_at)}</dd></div>
                  <div><dt className="inline text-muted">Going to: </dt><dd className="inline">{r.destination}</dd></div>
                  <div><dt className="inline text-muted">Escort: </dt><dd className="inline">{r.escort_name}</dd></div>
                  <div className="sm:col-span-2"><dt className="inline text-muted">Reason: </dt><dd className="inline">{r.reason}</dd></div>
                </dl>
                <p className="text-xs text-muted mt-2">Requested by {r.requester ?? "—"} on {fmtDateTime(r.created_at)}{r.decider ? ` · decided by ${r.decider}` : ""}</p>
                {r.decision_note && <p className="text-sm mt-1"><span className="font-semibold">Warden&apos;s note:</span> {r.decision_note}</p>}
                {next.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 items-start">
                    {next.filter((s) => s !== "rejected").map((s) => (
                      <ActionButton key={s} endpoint={`/api/hostel/leave/${r.id}`} method="PATCH" body={{ to: s }} label={ACTION_LABEL[s] ?? s} variant={s === "approved" ? "primary" : "secondary"} confirm={s === "cancelled" ? "Cancel this request?" : undefined} />
                    ))}
                    {next.includes("rejected") && (
                      <JsonForm endpoint={`/api/hostel/leave/${r.id}`} method="PATCH" extra={{ to: "rejected" }} className="flex gap-2 items-center" submitLabel="Reject" successMessage="Rejected.">
                        <label className="sr-only" htmlFor={`rj-${r.id}`}>Reason for rejecting</label>
                        <input id={`rj-${r.id}`} name="note" className="input !w-56" placeholder="Reason (shown to parent)" required />
                      </JsonForm>
                    )}
                  </div>
                )}
              </article>
            );
          }) : <div className="card"><EmptyState title="No requests" /></div>}
        </div>
        <Card title="New request">
          {!warden && !child?.is_boarder ? (
            <Notice>Leave and outpass requests are only for hostel boarders.</Notice>
          ) : (
            <JsonForm endpoint="/api/hostel/leave" submitLabel="Submit request" successMessage="Request submitted. The warden will decide." resetOnSuccess>
              {warden ? (
                <Field label="Student" htmlFor="lv-st"><select id="lv-st" name="studentId" className="select">{boarders.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.class_name})</option>)}</select></Field>
              ) : (
                <p className="text-sm">For <strong>{child?.name}</strong></p>
              )}
              <Field label="Type" htmlFor="lv-kind"><select id="lv-kind" name="kind" className="select"><option value="leave">Leave (overnight / home)</option><option value="outpass">Outpass (same day)</option></select></Field>
              <Field label="Leaving" htmlFor="lv-dep"><input id="lv-dep" name="departAt" type="datetime-local" className="input" required /></Field>
              <Field label="Returning" htmlFor="lv-ret"><input id="lv-ret" name="returnAt" type="datetime-local" className="input" required /></Field>
              <Field label="Going to" htmlFor="lv-dest"><input id="lv-dest" name="destination" className="input" required placeholder="e.g. Home, Ranchi" /></Field>
              <Field label="Escort (who will collect the student)" htmlFor="lv-esc"><input id="lv-esc" name="escortName" className="input" required /></Field>
              <Field label="Reason" htmlFor="lv-reason"><textarea id="lv-reason" name="reason" className="textarea" rows={2} required minLength={5} /></Field>
            </JsonForm>
          )}
        </Card>
      </div>
    </div>
  );
}
