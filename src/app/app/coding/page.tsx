import Link from "next/link";
import { Badge, Card, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { TRACKS, type Track } from "@/lib/coding";
import { getDb } from "@/lib/db";

export const metadata = { title: "Coding, AI & robotics" };

export default async function CodingHome() {
  const user = await requirePageUser("coding.use");
  const db = await getDb();
  const lessons = await db.query<{ slug: string; title: string; track: Track; level: string; challenges: number; passed: number }>(
    `SELECT l.slug, l.title, l.track, l.level, count(c.id)::int AS challenges,
            count(p.id) FILTER (WHERE p.status = 'passed')::int AS passed
       FROM coding_lessons l LEFT JOIN coding_challenges c ON c.lesson_id = l.id
       LEFT JOIN coding_progress p ON p.challenge_id = c.id AND p.student_id = $1
      GROUP BY l.id ORDER BY l.position`,
    [user.studentId ?? 0],
  );
  const projects = await db.query<{ id: number; track: Track; title: string; brief: string; deliverables: string; hardware_needed: string }>("SELECT * FROM projects ORDER BY id");
  const total = lessons.reduce((n, l) => n + l.challenges, 0);
  const done = lessons.reduce((n, l) => n + l.passed, 0);
  return (
    <div>
      <PageHeader
        eyebrow="Future skills"
        title="Coding, AI and robotics"
        description="Short lessons with hands-on challenges. Python, JavaScript and the robot run in your browser, so nothing needs installing."
        actions={user.studentId ? <Badge tone="brand">{done} / {total} challenges complete</Badge> : undefined}
      />
      <div className="grid md:grid-cols-2 gap-5">
        {(Object.keys(TRACKS) as Track[]).map((t) => (
          <Card key={t} title={TRACKS[t].label}>
            <p className="text-sm text-ink-2 -mt-1 mb-3">{TRACKS[t].blurb}</p>
            <ul className="divide-y divide-line">
              {lessons.filter((l) => l.track === t).map((l) => (
                <li key={l.slug} className="py-2.5 flex items-center justify-between gap-3">
                  <Link href={`/app/coding/${l.slug}`} className="text-sm font-semibold text-brand">{l.title}</Link>
                  {user.studentId ? (
                    <StatusBadge status={l.passed === l.challenges ? "passed" : l.passed ? "in_progress" : "not_started"} label={`${l.passed}/${l.challenges} done`} />
                  ) : <span className="badge">{l.challenges} challenge{l.challenges === 1 ? "" : "s"}</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <h2 className="mt-8 mb-3 font-bold">Project briefs</h2>
      <div className="mb-4">
        <Notice>Projects marked with hardware need equipment that is not part of the proposed fee. Physical kits and workshops require separate approval by the school.</Notice>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <article key={p.id} className="card card-pad">
            <div className="flex flex-wrap gap-2 mb-2"><Badge>{TRACKS[p.track]?.label ?? p.track}</Badge>{p.hardware_needed && <Badge tone="warn">Needs hardware</Badge>}</div>
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-ink-2 mt-1">{p.brief}</p>
            <p className="text-xs mt-2"><span className="font-semibold">Deliverables:</span> {p.deliverables}</p>
            {p.hardware_needed && <p className="text-xs mt-1 text-muted"><span className="font-semibold">Hardware:</span> {p.hardware_needed}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
