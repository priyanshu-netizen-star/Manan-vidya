import Link from "next/link";
import { BookOpen } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { studentLevel } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { MASTERY_LABEL, masteryBand } from "@/lib/quiz";

export const metadata = { title: "Learn" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const user = await requirePageUser("learning.use");
  const sp = await searchParams;
  const own = await studentLevel(user);
  const level = user.role === "student" ? own : Number(sp.level) || 8;
  const db = await getDb();
  const topics = await db.query<{ id: number; name: string; summary: string; subject: string; materials: number; quizzes: number; best: number | null }>(
    `SELECT t.id, t.name, t.summary, s.name AS subject,
            (SELECT count(*)::int FROM materials m WHERE m.topic_id = t.id AND m.status = 'approved') AS materials,
            (SELECT count(*)::int FROM quizzes qz WHERE qz.topic_id = t.id AND qz.status = 'published') AS quizzes,
            (SELECT max(round(100.0 * a.score / NULLIF(a.total,0)))::int FROM quiz_attempts a JOIN quizzes qz ON qz.id = a.quiz_id
              WHERE qz.topic_id = t.id AND a.student_id = $2) AS best
       FROM topics t JOIN subjects s ON s.id = t.subject_id
      WHERE t.class_level = $1 ORDER BY s.name, t.position`,
    [level, user.studentId ?? 0],
  );
  const bySubject = new Map<string, typeof topics>();
  for (const t of topics) bySubject.set(t.subject, [...(bySubject.get(t.subject) ?? []), t]);

  return (
    <div>
      <PageHeader
        eyebrow="AI learning platform"
        title="Learn and practise"
        description="Choose a topic to read material approved by your teachers, ask questions and take practice quizzes."
        actions={
          user.role !== "student" ? (
            <div className="flex gap-1" role="group" aria-label="Class level">
              {[6, 7, 8].map((l) => (
                <Link key={l} href={`/app/learn?level=${l}`} className={`btn btn-sm ${l === level ? "btn-primary" : "btn-secondary"}`}>
                  Class {["VI", "VII", "VIII"][l - 6]}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />
      {!topics.length ? (
        <div className="card">
          <EmptyState title="No topics yet for this class">Teachers add topics and approved material from the teacher workspace.</EmptyState>
        </div>
      ) : (
        <div className="space-y-8">
          {[...bySubject.entries()].map(([subject, list]) => (
            <section key={subject}>
              <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand" aria-hidden /> {subject}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((t) => {
                  const band = masteryBand(t.best);
                  return (
                    <Link key={t.id} href={`/app/learn/${t.id}`} className="card card-pad hover:border-brand/40 flex flex-col gap-2">
                      <span className="font-semibold text-ink">{t.name}</span>
                      <span className="text-sm text-ink-2 line-clamp-2">{t.summary}</span>
                      <span className="flex flex-wrap gap-2 mt-auto pt-2">
                        <span className="badge">{t.materials} material</span>
                        <span className="badge">{t.quizzes} quiz{t.quizzes === 1 ? "" : "zes"}</span>
                        {user.role === "student" && <StatusBadge status={band} label={MASTERY_LABEL[band]} />}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
