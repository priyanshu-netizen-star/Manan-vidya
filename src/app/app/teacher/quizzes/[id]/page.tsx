import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList } from "@/components/charts";
import { ActionButton, JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, Notice, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { questionAnalysis, teachOptions } from "@/lib/queries";

export const metadata = { title: "Quiz" };

export default async function QuizDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("quiz.manage");
  const id = Number((await params).id);
  const db = await getDb();
  const quiz = await db.one<{ id: number; title: string; instructions: string; status: string; topic_id: number; topic: string; class_id: number; class_name: string; published_at: string | null }>(
    `SELECT qz.id, qz.title, qz.instructions, qz.status, qz.topic_id, t.name AS topic, qz.class_id, c.name AS class_name, qz.published_at
       FROM quizzes qz JOIN topics t ON t.id = qz.topic_id JOIN classes c ON c.id = qz.class_id WHERE qz.id = $1`,
    [Number.isInteger(id) ? id : 0],
  );
  if (!quiz) notFound();
  const allowed = (await teachOptions(user)).some((o) => o.class_id === quiz.class_id && o.topic_id === quiz.topic_id);
  if (!allowed) notFound();

  const selected = await db.query<{ question_id: number }>("SELECT question_id FROM quiz_questions WHERE quiz_id = $1 ORDER BY position", [quiz.id]);
  const selectedIds = new Set(selected.map((s) => s.question_id));
  const bank = await db.query<{ id: number; prompt: string; difficulty: string; source: string }>(
    "SELECT id, prompt, difficulty, source FROM questions WHERE topic_id = $1 AND status = 'approved' ORDER BY id",
    [quiz.topic_id],
  );
  const drafts = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM questions WHERE topic_id = $1 AND status = 'draft'", [quiz.topic_id]);
  const analysis = await questionAnalysis(quiz.id);
  const students = await db.query<{ name: string; roll_no: number; attempts: number; latest: string; best: number; last_at: string }>(
    `SELECT s.name, s.roll_no, count(*)::int AS attempts,
            (array_agg(a.score || '/' || a.total ORDER BY a.submitted_at DESC))[1] AS latest,
            max(round(100.0 * a.score / NULLIF(a.total,0)))::int AS best, max(a.submitted_at) AS last_at
       FROM quiz_attempts a JOIN students s ON s.id = a.student_id WHERE a.quiz_id = $1
      GROUP BY s.id, s.name, s.roll_no ORDER BY s.roll_no`,
    [quiz.id],
  );
  const notAttempted = await db.query<{ name: string }>(
    "SELECT name FROM students s WHERE s.class_id = $1 AND s.status = 'active' AND NOT EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.quiz_id = $2 AND a.student_id = s.id) ORDER BY roll_no",
    [quiz.class_id, quiz.id],
  );
  const avg = students.length ? Math.round(students.reduce((n, s) => n + s.best, 0) / students.length) : null;

  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/teacher/quizzes" className="text-brand font-semibold">← Quizzes</Link></p>
      <PageHeader
        eyebrow={`${quiz.class_name} · ${quiz.topic}`}
        title={quiz.title}
        actions={
          <>
            <StatusBadge status={quiz.status} />
            <Link href={`/app/quiz/${quiz.id}`} className="btn btn-secondary btn-sm">Preview as student</Link>
            {quiz.status === "draft" && (
              <ActionButton endpoint={`/api/quizzes/${quiz.id}`} method="PATCH" body={{ action: "publish" }} label="Publish to class" variant="primary" confirm={`Publish to ${quiz.class_name}? Students will see it immediately.`} />
            )}
            {quiz.status === "published" && (
              <ActionButton endpoint={`/api/quizzes/${quiz.id}`} method="PATCH" body={{ action: "archive" }} label="Close quiz" confirm="Close this quiz? Students will no longer see it. Results are kept." />
            )}
          </>
        }
      />
      {quiz.status === "draft" ? (
        <Card title="Questions">
          {drafts && drafts.n > 0 && (
            <div className="mb-4"><Notice>{drafts.n} question{drafts.n === 1 ? " is" : "s are"} still awaiting review for this topic. <Link href={`/app/teacher/questions?topicId=${quiz.topic_id}&status=draft`} className="font-semibold text-brand">Review them</Link> to make them available here.</Notice></div>
          )}
          {bank.length ? (
            <JsonForm endpoint={`/api/quizzes/${quiz.id}`} method="PATCH" extra={{ action: "edit" }} submitLabel="Save quiz" successMessage="Quiz saved.">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title" htmlFor="qe-title"><input id="qe-title" name="title" className="input" defaultValue={quiz.title} required /></Field>
                <Field label="Instructions" htmlFor="qe-ins"><input id="qe-ins" name="instructions" className="input" defaultValue={quiz.instructions} /></Field>
              </div>
              <fieldset>
                <legend className="label">Approved questions for this topic ({selectedIds.size} selected)</legend>
                <ul className="space-y-1.5">
                  {bank.map((q) => (
                    <li key={q.id}>
                      <label className="flex gap-3 items-start rounded-lg border border-line px-3 py-2 text-sm cursor-pointer hover:border-brand/40">
                        <input type="checkbox" name="questionIds" value={q.id} data-multi defaultChecked={selectedIds.has(q.id)} className="mt-1 accent-[#6c5ce7]" />
                        <span className="flex-1">{q.prompt}</span>
                        <span className="badge">{q.difficulty}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </JsonForm>
          ) : (
            <EmptyState title="No approved questions for this topic">
              <Link href={`/app/teacher/questions?topicId=${quiz.topic_id}`} className="text-brand font-semibold">Add or approve questions</Link> first.
            </EmptyState>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Students attempted" value={`${students.length} / ${students.length + notAttempted.length}`} />
            <Stat label="Average best score" value={avg == null ? "—" : `${avg}%`} />
            <Stat label="Questions" value={selected.length} />
            <Stat label="Published" value={quiz.published_at ? fmtDateTime(quiz.published_at) : "—"} />
          </div>
          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            <Card title="Correct answers by question">
              <BarList
                title="Percentage of answers correct per question"
                valueLabel="Correct"
                max={100}
                data={analysis.map((a, i) => ({
                  label: `Q${i + 1}. ${a.prompt}`,
                  value: a.answered ? Math.round((100 * a.correct) / a.answered) : 0,
                  display: a.answered ? `${Math.round((100 * a.correct) / a.answered)}%` : "—",
                  sub: a.common_wrong != null ? `Common wrong: ${String.fromCharCode(65 + a.common_wrong)}` : undefined,
                }))}
              />
              <p className="hint mt-3">Questions with low scores and a common wrong answer often point to a misconception worth re-teaching.</p>
            </Card>
            <Card title="Students" pad={false}>
              <div className="table-wrap max-h-96 overflow-y-auto">
                <table className="table">
                  <thead><tr><th>Roll</th><th>Student</th><th>Latest</th><th>Best</th><th>Attempts</th></tr></thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.roll_no}><td>{s.roll_no}</td><td>{s.name}</td><td>{s.latest}</td><td>{s.best}%</td><td>{s.attempts}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {notAttempted.length > 0 && <p className="card-pad text-sm text-muted">Not attempted yet: {notAttempted.map((s) => s.name).join(", ")}</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
