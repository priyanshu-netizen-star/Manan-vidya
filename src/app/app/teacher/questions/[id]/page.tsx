import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonForm } from "@/components/forms";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { manageableTopics } from "@/lib/queries";
import { QuestionFields } from "../QuestionFields";

export const metadata = { title: "Edit question" };

export default async function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("content.manage");
  const id = Number((await params).id);
  const db = await getDb();
  const q = await db.one<{ id: number; topic_id: number; topic: string; prompt: string; options: string[]; correct_index: number; explanation: string; difficulty: string; status: string; answered: number }>(
    `SELECT q.id, q.topic_id, t.name AS topic, q.prompt, q.options, q.correct_index, q.explanation, q.difficulty, q.status,
            (SELECT count(*)::int FROM quiz_attempts a JOIN quiz_questions qq ON qq.quiz_id = a.quiz_id WHERE qq.question_id = q.id) AS answered
       FROM questions q JOIN topics t ON t.id = q.topic_id WHERE q.id = $1`,
    [Number.isInteger(id) ? id : 0],
  );
  if (!q || !(await manageableTopics(user)).some((t) => t.id === q.topic_id)) notFound();
  return (
    <div className="max-w-2xl">
      <p className="text-sm mb-2"><Link href="/app/teacher/questions" className="text-brand font-semibold">← Question bank</Link></p>
      <PageHeader eyebrow={q.topic} title="Edit question" />
      {q.answered > 0 ? (
        <Notice tone="warn">Students have already answered this question ({q.answered} attempts), so it cannot be changed: past results must stay accurate. Write a new question instead.</Notice>
      ) : (
        <Card>
          <p className="text-sm text-muted mb-4">Saving sends the question back to &quot;awaiting review&quot;.</p>
          <JsonForm endpoint={`/api/questions/${q.id}`} method="PATCH" extra={{ action: "edit" }} submitLabel="Save changes" redirectTo="/app/teacher/questions?status=draft">
            <QuestionFields idPrefix="edit" defaults={q} />
          </JsonForm>
        </Card>
      )}
    </div>
  );
}
