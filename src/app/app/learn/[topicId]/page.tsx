import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { assertTopicAccess } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { ApiError } from "@/lib/http";
import { AskBox } from "./AskBox";

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const user = await requirePageUser("learning.use");
  const topicId = Number((await params).topicId);
  if (!Number.isInteger(topicId)) notFound();
  let topic;
  try {
    topic = await assertTopicAccess(user, topicId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    redirect("/app/learn");
  }
  const db = await getDb();
  const materials = await db.query<{ id: number; title: string; body: string; updated_at: string }>(
    "SELECT id, title, body, updated_at FROM materials WHERE topic_id = $1 AND status = 'approved' ORDER BY id",
    [topicId],
  );
  const quizzes = await db.query<{ id: number; title: string; class_name: string; questions: number; best: number | null; attempts: number }>(
    `SELECT qz.id, qz.title, c.name AS class_name,
            (SELECT count(*)::int FROM quiz_questions qq WHERE qq.quiz_id = qz.id) AS questions,
            (SELECT max(round(100.0 * a.score / NULLIF(a.total,0)))::int FROM quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = $2) AS best,
            (SELECT count(*)::int FROM quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = $2) AS attempts
       FROM quizzes qz JOIN classes c ON c.id = qz.class_id
      WHERE qz.topic_id = $1 AND qz.status = 'published' ORDER BY qz.published_at DESC`,
    [topicId, user.studentId ?? 0],
  );
  const worksheets = await db.query<{ id: number; title: string }>(
    "SELECT id, title FROM worksheets WHERE topic_id = $1 AND status = 'approved' ORDER BY id",
    [topicId],
  );
  if (user.studentId && materials.length) {
    await db.query("INSERT INTO learning_events (student_id, topic_id, kind, detail) VALUES ($1,$2,'material_view','{}')", [user.studentId, topicId]);
  }

  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/learn" className="text-brand font-semibold">← All topics</Link></p>
      <PageHeader eyebrow={`${topic.subject} · Class ${["VI", "VII", "VIII"][topic.class_level - 6] ?? topic.class_level}`} title={topic.name} description={topic.summary} />
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-5">
          {materials.length ? (
            materials.map((m) => (
              <Card key={m.id} title={m.title} actions={<span className="badge badge-good" title="Approved by a teacher">Teacher-approved · {fmtDate(m.updated_at)}</span>}>
                <Markdown source={m.body} />
              </Card>
            ))
          ) : (
            <div className="card"><EmptyState title="No approved material yet">Your teacher has not published material for this topic.</EmptyState></div>
          )}
        </div>
        <div className="space-y-5 lg:sticky lg:top-4">
          <Card title="Ask a question">
            <AskBox topicId={topicId} aiEnabled={aiConfigured()} />
          </Card>
          <Card title="Practice quizzes">
            {quizzes.length ? (
              <ul className="divide-y divide-line">
                {quizzes.map((q) => (
                  <li key={q.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{q.title}</p>
                        <p className="text-xs text-muted">{q.questions} questions · {q.class_name}</p>
                      </div>
                      <Link href={`/app/quiz/${q.id}`} className="btn btn-primary btn-sm">{q.attempts ? "Retake" : "Start"}</Link>
                    </div>
                    {q.best != null && <p className="mt-1"><StatusBadge status={q.best >= 80 ? "secure" : q.best >= 50 ? "developing" : "needs_support"} label={`Best ${q.best}% · ${q.attempts} attempt${q.attempts === 1 ? "" : "s"}`} /></p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No quiz published for this topic yet.</p>
            )}
          </Card>
          {worksheets.length > 0 && (
            <Card title="Worksheets">
              <ul className="space-y-1.5">
                {worksheets.map((w) => (
                  <li key={w.id}><Link href={`/app/worksheet/${w.id}`} className="text-sm text-brand font-semibold">{w.title}</Link></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
