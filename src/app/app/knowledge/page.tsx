import { JsonForm } from "@/components/forms";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { VERIFICATION_LABEL, type KbEntry } from "@/lib/kb";

export const metadata = { title: "Assistant knowledge base" };

type Row = KbEntry & { published: boolean; updated_at: string };

function KbFields({ e, prefix }: { e?: Row; prefix: string }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Category" htmlFor={`${prefix}-cat`}><input id={`${prefix}-cat`} name="category" className="input" defaultValue={e?.category} required /></Field>
        <Field label="Verification" htmlFor={`${prefix}-ver`}>
          <select id={`${prefix}-ver`} name="verification" className="select" defaultValue={e?.verification ?? "pending_school"}>
            <option value="school_confirmed">Confirmed by the school</option>
            <option value="public_source">From public website (awaiting confirmation)</option>
            <option value="pending_school">Awaiting school confirmation</option>
          </select>
        </Field>
      </div>
      <Field label="Question (English)" htmlFor={`${prefix}-qen`}><input id={`${prefix}-qen`} name="question_en" className="input" defaultValue={e?.question_en} required /></Field>
      <Field label="Answer (English)" htmlFor={`${prefix}-aen`}><textarea id={`${prefix}-aen`} name="answer_en" className="textarea" rows={3} defaultValue={e?.answer_en} required /></Field>
      <Field label="प्रश्न (Hindi)" htmlFor={`${prefix}-qhi`}><input id={`${prefix}-qhi`} name="question_hi" className="input" lang="hi" defaultValue={e?.question_hi} /></Field>
      <Field label="उत्तर (Hindi)" htmlFor={`${prefix}-ahi`}><textarea id={`${prefix}-ahi`} name="answer_hi" className="textarea" rows={3} lang="hi" defaultValue={e?.answer_hi} /></Field>
      <Field label="Keywords" htmlFor={`${prefix}-kw`} hint="Comma-separated words parents might use, in English or Hindi.">
        <input id={`${prefix}-kw`} name="keywords" className="input" defaultValue={e?.keywords} />
      </Field>
      <Field label="Source" htmlFor={`${prefix}-src`} hint="Where this information comes from (page, circular, or staff member who confirmed it)."><input id={`${prefix}-src`} name="source" className="input" defaultValue={e?.source} /></Field>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex gap-2 items-center"><input type="checkbox" name="hindi_reviewed" defaultChecked={e?.hindi_reviewed} className="accent-[#6c5ce7]" /> Hindi text reviewed by a fluent staff member</label>
        <label className="flex gap-2 items-center"><input type="checkbox" name="published" defaultChecked={e?.published ?? false} className="accent-[#6c5ce7]" /> Published to the assistant</label>
      </div>
    </>
  );
}

export default async function KnowledgePage() {
  await requirePageUser("kb.manage");
  const db = await getDb();
  const entries = await db.query<Row>("SELECT * FROM kb_entries ORDER BY category, id");
  const gaps = await db.query<{ question: string; language: string; escalation_reason: string | null; created_at: string }>(
    "SELECT question, language, escalation_reason, created_at FROM assistant_logs WHERE mode = 'escalated' ORDER BY created_at DESC LIMIT 15",
  );
  const confirmed = entries.filter((e) => e.verification === "school_confirmed").length;
  return (
    <div>
      <PageHeader
        eyebrow="Admissions"
        title="Assistant knowledge base"
        description="The admissions assistant can only answer from published entries below. Nothing else is invented."
      />
      <div className="mb-5">
        <Notice tone={confirmed < entries.length ? "warn" : "info"}>
          {confirmed} of {entries.length} entries are confirmed by the school. Before go-live, every published answer must be confirmed by the school and every Hindi answer
          reviewed by a fluent staff member. Fee information should be added only when the school approves it for publication.
        </Notice>
      </div>
      <div className="grid xl:grid-cols-[1fr_24rem] gap-5 items-start">
        <div className="space-y-3">
          {entries.map((e) => (
            <details key={e.id} className="card group">
              <summary className="card-pad cursor-pointer list-none flex flex-wrap items-center gap-2">
                <span className="font-semibold flex-1 min-w-[12rem]">{e.question_en}</span>
                <Badge>{e.category}</Badge>
                <Badge tone={e.verification === "school_confirmed" ? "good" : "warn"}>{VERIFICATION_LABEL[e.verification].split(" (")[0]}</Badge>
                {!e.published && <Badge tone="bad">Not published</Badge>}
                {e.answer_hi && !e.hindi_reviewed && <Badge tone="warn">Hindi not reviewed</Badge>}
              </summary>
              <div className="px-5 pb-5 border-t border-line pt-4">
                <p className="text-xs text-muted mb-3">Last updated {fmtDateTime(e.updated_at)}</p>
                <JsonForm endpoint={`/api/kb/${e.id}`} method="PATCH" submitLabel="Save entry" successMessage="Saved.">
                  <KbFields e={e} prefix={`kb${e.id}`} />
                </JsonForm>
              </div>
            </details>
          ))}
        </div>
        <div className="space-y-5">
          <Card title="Questions the assistant passed to staff">
            {gaps.length ? (
              <ul className="space-y-2.5 text-sm">
                {gaps.map((g, i) => (
                  <li key={i}>
                    <p>“{g.question}”</p>
                    <p className="text-xs text-muted">{fmtDateTime(g.created_at)}{g.language === "hi" ? " · Hindi" : ""} · {g.escalation_reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">None yet. Questions the assistant could not answer appear here so you can add approved answers.</p>
            )}
          </Card>
          <Card title="Add an entry">
            <JsonForm endpoint="/api/kb" submitLabel="Add entry" successMessage="Entry added." resetOnSuccess>
              <KbFields prefix="new" />
            </JsonForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
