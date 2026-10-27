import Link from "next/link";
import { JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { teachOptions } from "@/lib/queries";

export const metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  const user = await requirePageUser("quiz.manage");
  const options = await teachOptions(user);
  const db = await getDb();
  const quizzes = await db.query<{ id: number; title: string; status: string; class_name: string; topic: string; questions: number; attempts: number; avg: number | null; published_at: string | null }>(
    `SELECT qz.id, qz.title, qz.status, c.name AS class_name, t.name AS topic, qz.published_at,
            (SELECT count(*)::int FROM quiz_questions qq WHERE qq.quiz_id = qz.id) AS questions,
            (SELECT count(*)::int FROM quiz_attempts a WHERE a.quiz_id = qz.id) AS attempts,
            (SELECT round(avg(100.0 * a.score / NULLIF(a.total,0)))::int FROM quiz_attempts a WHERE a.quiz_id = qz.id) AS avg
       FROM quizzes qz JOIN classes c ON c.id = qz.class_id JOIN topics t ON t.id = qz.topic_id
      WHERE EXISTS (SELECT 1 FROM unnest($1::int[], $2::int[]) AS o(class_id, topic_id) WHERE o.class_id = qz.class_id AND o.topic_id = qz.topic_id)
      ORDER BY (qz.status = 'draft') DESC, qz.created_at DESC`,
    [options.map((o) => o.class_id), options.map((o) => o.topic_id)],
  );
  return (
    <div>
      <PageHeader eyebrow="Teacher workspace" title="Quizzes" description="Create a quiz, add approved questions, preview it, then publish it to the class. Students are marked instantly and see explanations." />
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <Card pad={false}>
          {quizzes.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Quiz</th><th>Class</th><th>Status</th><th>Questions</th><th>Attempts</th><th>Average</th></tr></thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id}>
                      <td><Link href={`/app/teacher/quizzes/${q.id}`} className="font-semibold text-brand">{q.title}</Link><p className="text-xs text-muted">{q.topic}</p></td>
                      <td>{q.class_name}</td>
                      <td><StatusBadge status={q.status} />{q.published_at && <p className="text-xs text-muted mt-1">{fmtDate(q.published_at)}</p>}</td>
                      <td>{q.questions}</td>
                      <td>{q.attempts}</td>
                      <td>{q.avg == null ? "—" : `${q.avg}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No quizzes yet">Create your first quiz with the form.</EmptyState>
          )}
        </Card>
        <Card title="New quiz">
          {options.length ? (
            <QuizCreateForm options={options} />
          ) : (
            <p className="text-sm text-muted">You need a teaching assignment and at least one topic before creating quizzes.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuizCreateForm({ options }: { options: Awaited<ReturnType<typeof teachOptions>> }) {
  return (
    <JsonForm endpoint="/api/quizzes" submitLabel="Create draft quiz" redirectTo="/app/teacher/quizzes/{id}">
      <Field label="Class and topic" htmlFor="qz-ct" hint="The quiz goes to this class only.">
        <select id="qz-ct" name="classTopic" className="select" required>
          {options.map((o) => (
            <option key={`${o.class_id}-${o.topic_id}`} value={`${o.class_id}:${o.topic_id}`}>{o.class_name} · {o.subject} · {o.topic}</option>
          ))}
        </select>
      </Field>
      <Field label="Title" htmlFor="qz-title"><input id="qz-title" name="title" className="input" required minLength={3} maxLength={160} placeholder="e.g. Force and Pressure: weekly check" /></Field>
      <Field label="Instructions for students" htmlFor="qz-ins"><textarea id="qz-ins" name="instructions" className="textarea" rows={2} maxLength={1000} /></Field>
    </JsonForm>
  );
}
