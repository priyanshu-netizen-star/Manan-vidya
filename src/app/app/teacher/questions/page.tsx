import Link from "next/link";
import { ActionButton, JsonForm } from "@/components/forms";
import { Badge, Card, EmptyState, Field, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { levelName, manageableTopics } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { QuestionFields } from "./QuestionFields";

export const metadata = { title: "Question bank" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ topicId?: string; status?: string }> }) {
  const user = await requireAnyPermission("content.manage", "content.approve");
  const sp = await searchParams;
  const topics = await manageableTopics(user);
  const topicId = topics.some((t) => t.id === Number(sp.topicId)) ? Number(sp.topicId) : null;
  const status = ["draft", "approved", "archived"].includes(sp.status ?? "") ? sp.status! : "all";
  const db = await getDb();
  const rows = await db.query<{
    id: number; prompt: string; options: string[]; correct_index: number; explanation: string; difficulty: string; status: string; source: string; topic: string; reviewer: string | null;
  }>(
    `SELECT q.id, q.prompt, q.options, q.correct_index, q.explanation, q.difficulty, q.status, q.source, t.name AS topic, r.name AS reviewer
       FROM questions q JOIN topics t ON t.id = q.topic_id LEFT JOIN users r ON r.id = q.reviewed_by
      WHERE q.topic_id = ANY($1::int[]) AND ($2::int IS NULL OR q.topic_id = $2) AND ($3 = 'all' OR q.status = $3)
      ORDER BY (q.status = 'draft') DESC, q.topic_id, q.id DESC LIMIT 200`,
    [topics.map((t) => t.id), topicId, status],
  );
  const canEdit = can(user.role, "content.manage");
  const canApprove = can(user.role, "content.approve");
  const canAi = can(user.role, "ai.teacher_tools");
  const topicOptions = topics.map((t) => <option key={t.id} value={t.id}>Class {levelName(t.class_level)} · {t.subject} · {t.name}</option>);

  return (
    <div>
      <PageHeader eyebrow="Teacher workspace" title="Question bank" description="Every question, whether written by a teacher or drafted by AI, must be approved before it can be used in a quiz or worksheet." />
      <form className="card card-pad flex flex-wrap gap-3 items-end mb-5" method="get">
        <Field label="Topic" htmlFor="f-topic">
          <select id="f-topic" name="topicId" className="select" defaultValue={topicId ?? ""}>
            <option value="">All topics</option>
            {topicOptions}
          </select>
        </Field>
        <Field label="Status" htmlFor="f-status">
          <select id="f-status" name="status" className="select" defaultValue={status}>
            <option value="all">All</option>
            <option value="draft">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <button className="btn btn-secondary">Filter</button>
      </form>
      <div className="grid lg:grid-cols-[1fr_24rem] gap-5 items-start">
        <div className="space-y-3">
          {rows.length ? (
            rows.map((q) => (
              <article key={q.id} className="card card-pad">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusBadge status={q.status} label={q.status === "draft" ? "awaiting review" : q.status} />
                  {q.source === "ai_draft" && <Badge tone="brand" title="Drafted by AI from approved material. Check it carefully before approving.">AI draft</Badge>}
                  <Badge>{q.difficulty}</Badge>
                  <span className="text-xs text-muted">{q.topic}{q.reviewer ? ` · approved by ${q.reviewer}` : ""}</span>
                </div>
                <p className="font-semibold">{q.prompt}</p>
                <ol className="mt-2 grid sm:grid-cols-2 gap-1.5 text-sm">
                  {q.options.map((o, i) => (
                    <li key={i} className={`rounded-md px-2.5 py-1.5 border ${i === q.correct_index ? "border-good bg-good/10 font-semibold" : "border-line"}`}>
                      {String.fromCharCode(65 + i)}. {o}
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-ink-2 mt-2"><span className="font-semibold">Explanation:</span> {q.explanation}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {q.status === "draft" && canApprove && <ActionButton endpoint={`/api/questions/${q.id}`} method="PATCH" body={{ action: "approve" }} label="Approve" variant="primary" />}
                  {canEdit && q.status !== "archived" && <Link href={`/app/teacher/questions/${q.id}`} className="btn btn-secondary btn-sm">Edit</Link>}
                  {canEdit && q.status !== "archived" && <ActionButton endpoint={`/api/questions/${q.id}`} method="PATCH" body={{ action: "archive" }} label="Archive" confirm="Archive this question?" />}
                </div>
              </article>
            ))
          ) : (
            <div className="card"><EmptyState title="No questions match these filters" /></div>
          )}
        </div>
        <div className="space-y-5">
          {canAi && (
            <Card title="Draft questions with AI">
              {!aiConfigured() && (
                <div className="mb-3"><Notice tone="warn">The AI service is not configured for this deployment. This form will report that clearly; nothing is simulated.</Notice></div>
              )}
              <JsonForm endpoint="/api/questions/ai-draft" submitLabel="Draft questions" successMessage="Drafts created. Review each one below before approving.">
                <Field label="Topic" htmlFor="ai-topic"><select id="ai-topic" name="topicId" className="select" defaultValue={topicId ?? undefined}>{topicOptions}</select></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="How many" htmlFor="ai-count"><input id="ai-count" name="count" type="number" min={1} max={10} defaultValue={5} className="input" /></Field>
                  <Field label="Difficulty" htmlFor="ai-diff">
                    <select id="ai-diff" name="difficulty" className="select" defaultValue="mixed">
                      <option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                  </Field>
                </div>
                <p className="hint">Questions are drafted only from this topic&apos;s approved material and saved as drafts.</p>
              </JsonForm>
            </Card>
          )}
          {canEdit && (
            <Card title="Write a question">
              <JsonForm endpoint="/api/questions" submitLabel="Save as draft" successMessage="Question saved as a draft." resetOnSuccess>
                <Field label="Topic" htmlFor="q-topic"><select id="q-topic" name="topicId" className="select" defaultValue={topicId ?? undefined}>{topicOptions}</select></Field>
                <QuestionFields idPrefix="new" />
              </JsonForm>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
