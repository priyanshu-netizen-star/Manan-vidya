import Link from "next/link";
import { notFound } from "next/navigation";
import { AiAction } from "@/components/ai/AiBits";
import { JsonForm } from "@/components/forms";
import { Badge, Card, Field, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { ENQUIRY_FLOW, ENQUIRY_LABEL, type EnquiryStatus } from "@/lib/workflows";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser("enquiry.manage");
  const id = Number((await params).id);
  const db = await getDb();
  const e = await db.one<{
    id: number; ref_code: string; parent_name: string; phone: string; email: string | null; child_name: string; grade_sought: string; boarding_interest: string;
    message: string; language: string; source: string; status: EnquiryStatus; assigned_to: number | null; escalated: boolean; escalation_reason: string | null;
    next_follow_up: string | null; created_at: string; seeded: boolean;
  }>("SELECT * FROM enquiries WHERE id = $1", [Number.isInteger(id) ? id : 0]);
  if (!e) notFound();
  const staff = await db.query<{ id: number; name: string }>("SELECT id, name FROM users WHERE active AND role IN ('office_admin','management') ORDER BY name");
  const history = await db.query<{ from_status: string | null; to_status: string | null; note: string | null; actor_label: string; created_at: string }>(
    "SELECT from_status, to_status, note, actor_label, created_at FROM status_history WHERE entity = 'enquiry' AND entity_id = $1 ORDER BY created_at DESC, id DESC",
    [e.id],
  );
  const next = ENQUIRY_FLOW[e.status];
  const endpoint = `/api/enquiries/${e.id}`;

  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/enquiries" className="text-brand font-semibold">← Enquiries</Link></p>
      <PageHeader
        eyebrow={`Enquiry ${e.ref_code}`}
        title={`${e.parent_name} · ${e.grade_sought}`}
        actions={<><StatusBadge status={e.status} label={ENQUIRY_LABEL[e.status]} />{e.seeded && <Badge tone="warn">Sample record</Badge>}</>}
      />
      {e.escalated && (
        <div className="mb-5">
          <Notice tone="warn">
            <strong>Needs a personal reply from staff.</strong> {e.escalation_reason} The assistant did not answer this; please contact the parent.
          </Notice>
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-5">
          <Card title="Details">
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Parent / guardian", e.parent_name],
                ["Phone", <a key="p" href={`tel:${e.phone}`} className="text-brand">{e.phone}</a>],
                ["Email", e.email ?? "—"],
                ["Child", e.child_name],
                ["Class sought", e.grade_sought],
                ["Day / boarding", e.boarding_interest],
                ["Received", `${fmtDateTime(e.created_at)} via ${e.source === "assistant" ? "assistant" : "web form"}`],
                ["Language", e.language === "hi" ? "Hindi" : "English"],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="text-xs font-semibold text-muted">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {e.message && <p className="mt-4 text-sm rounded-lg bg-surface-2 p-3 whitespace-pre-wrap">{e.message}</p>}
          </Card>
          <section className="ai-card p-5">
            <h2 className="font-bold text-[0.9rem] flex items-center gap-2"><span className="ai-chip">AI</span> Draft a reply to the parent</h2>
            <AiAction
              className="mt-2"
              endpoint="/api/ai/enquiry-reply"
              body={{ enquiryId: e.id }}
              label={`Draft reply in ${e.language === "hi" ? "Hindi" : "English"}`}
              busyLabel="Drafting"
              description="Uses only the verified school facts in the assistant's knowledge base. Nothing is sent: copy the draft, edit it, and send it yourself by phone message or email. Fees, seats and decisions are always left for the office to confirm."
            />
          </section>
          <Card title="Timeline">
            <ol className="border-l-2 border-line pl-4 space-y-3">
              {history.map((h, i) => (
                <li key={i} className="text-sm">
                  <p className="text-xs text-muted">{fmtDateTime(h.created_at)} · {h.actor_label}</p>
                  {h.to_status && <p>Status: {h.from_status ? `${ENQUIRY_LABEL[h.from_status as EnquiryStatus] ?? h.from_status} → ` : ""}<strong>{ENQUIRY_LABEL[h.to_status as EnquiryStatus] ?? h.to_status}</strong></p>}
                  {h.note && <p className="text-ink-2">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-5">
          {next.length > 0 && (
            <Card title="Update status">
              <JsonForm endpoint={endpoint} method="PATCH" extra={{ action: "status" }} submitLabel="Update" successMessage="Status updated." resetOnSuccess>
                <Field label="Move to" htmlFor="st-to">
                  <select id="st-to" name="to" className="select">{next.map((s) => <option key={s} value={s}>{ENQUIRY_LABEL[s]}</option>)}</select>
                </Field>
                <Field label="Note" htmlFor="st-note" hint="Required when marking admitted."><textarea id="st-note" name="note" className="textarea" rows={2} /></Field>
              </JsonForm>
            </Card>
          )}
          <Card title="Follow-up">
            <JsonForm endpoint={endpoint} method="PATCH" extra={{ action: "follow_up" }} submitLabel="Set date" successMessage="Follow-up saved.">
              <Field label="Next follow-up" htmlFor="fu-date"><input id="fu-date" name="date" type="date" className="input" defaultValue={e.next_follow_up ?? ""} /></Field>
            </JsonForm>
            <p className="hint mt-2">Current: {e.next_follow_up ? fmtDate(e.next_follow_up) : "none"}</p>
          </Card>
          <Card title="Owner">
            <JsonForm endpoint={endpoint} method="PATCH" extra={{ action: "assign" }} submitLabel="Assign" successMessage="Owner updated.">
              <Field label="Assigned to" htmlFor="as-user">
                <select id="as-user" name="assigneeId" className="select" defaultValue={e.assigned_to ?? ""}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </JsonForm>
          </Card>
          <Card title="Add a note">
            <JsonForm endpoint={endpoint} method="PATCH" extra={{ action: "note" }} submitLabel="Add note" successMessage="Note added." resetOnSuccess>
              <textarea name="note" className="textarea" rows={2} required aria-label="Note" placeholder="e.g. Called parent, will visit on Saturday" />
            </JsonForm>
          </Card>
          {e.escalated && (
            <Card title="Mark escalation handled">
              <JsonForm endpoint={endpoint} method="PATCH" extra={{ action: "resolve_escalation" }} submitLabel="Mark handled" successMessage="Escalation closed.">
                <textarea name="note" className="textarea" rows={2} required aria-label="How it was handled" placeholder="How was the parent's question answered?" />
              </JsonForm>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
