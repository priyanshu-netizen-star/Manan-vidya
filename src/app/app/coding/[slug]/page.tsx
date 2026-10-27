import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { TRACKS, publicSpec, type Track } from "@/lib/coding";
import { getDb } from "@/lib/db";
import { CodeChallenge, McqChallenge, RobotChallenge, type ChallengeData } from "./Challenge";

export const metadata = { title: "Lesson" };

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser("coding.use");
  const { slug } = await params;
  const db = await getDb();
  const lesson = await db.one<{ id: number; title: string; track: Track; level: string; body: string }>("SELECT id, title, track, level, body FROM coding_lessons WHERE slug = $1", [slug]);
  if (!lesson) notFound();
  const rows = await db.query<{ slug: string; title: string; kind: ChallengeData["kind"]; prompt: string; starter: string; spec: unknown; hint: string; status: string | null; code: string | null }>(
    `SELECT c.slug, c.title, c.kind, c.prompt, c.starter, c.spec, c.hint, p.status, p.code
       FROM coding_challenges c LEFT JOIN coding_progress p ON p.challenge_id = c.id AND p.student_id = $2
      WHERE c.lesson_id = $1 ORDER BY c.id`,
    [lesson.id, user.studentId ?? 0],
  );
  const challenges: ChallengeData[] = rows.map((r) => ({ ...r, starter: r.code || r.starter, spec: publicSpec(r.kind, r.spec) }));
  const siblings = await db.query<{ slug: string; title: string }>("SELECT slug, title FROM coding_lessons WHERE track = $1 ORDER BY position", [lesson.track]);
  const idx = siblings.findIndex((s) => s.slug === slug);
  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/coding" className="text-brand font-semibold">← Coding, AI and robotics</Link></p>
      <PageHeader eyebrow={`${TRACKS[lesson.track].label} · ${lesson.level}`} title={lesson.title} />
      <div className="grid xl:grid-cols-[22rem_1fr] gap-5 items-start">
        <Card title="Lesson"><Markdown source={lesson.body} /></Card>
        <div className="space-y-5">
          {challenges.map((c) => (
            <Card key={c.slug} title={c.title} actions={c.status ? <StatusBadge status={c.status === "passed" ? "passed" : "in_progress"} label={c.status === "passed" ? "Completed" : "Attempted"} /> : undefined}>
              <p className="text-sm mb-3">{c.prompt}</p>
              {c.kind === "mcq" ? <McqChallenge c={c} /> : c.kind === "robot" ? <RobotChallenge c={c} /> : <CodeChallenge c={c} />}
            </Card>
          ))}
          <div className="flex flex-wrap justify-between gap-2">
            {idx > 0 ? <Link href={`/app/coding/${siblings[idx - 1].slug}`} className="btn btn-secondary btn-sm !whitespace-normal text-left">← {siblings[idx - 1].title}</Link> : <span />}
            {idx < siblings.length - 1 && <Link href={`/app/coding/${siblings[idx + 1].slug}`} className="btn btn-secondary btn-sm !whitespace-normal text-right ml-auto">{siblings[idx + 1].title} →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
