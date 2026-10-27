import Link from "next/link";
import { AiAction } from "@/components/ai/AiBits";
import { BarList } from "@/components/charts";
import { Card, EmptyState, PageHeader, SampleDataTag, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { MASTERY_LABEL, masteryBand } from "@/lib/quiz";
import { classesList, topicPerformance } from "@/lib/queries";

export const metadata = { title: "Class performance" };

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const user = await requirePageUser("performance.view");
  const sp = await searchParams;
  const classes = await classesList();
  const classId = classes.some((c) => c.id === Number(sp.classId)) ? Number(sp.classId) : null;
  const rows = await topicPerformance({ teacherId: user.role === "teacher" ? user.id : undefined, classId: classId ?? undefined });
  const db = await getDb();
  const support = await db.query<{ name: string; class_name: string; topic: string; best: number }>(
    `SELECT s.name, c.name AS class_name, t.name AS topic, max(round(100.0 * a.score / NULLIF(a.total,0)))::int AS best
       FROM quiz_attempts a JOIN students s ON s.id = a.student_id JOIN classes c ON c.id = s.class_id
       JOIN quizzes qz ON qz.id = a.quiz_id JOIN topics t ON t.id = qz.topic_id
      WHERE ($1::int IS NULL OR c.id = $1) AND qz.topic_id = ANY($2::int[])
      GROUP BY s.id, s.name, c.name, t.id, t.name HAVING max(100.0 * a.score / NULLIF(a.total,0)) < 50
      ORDER BY best, s.name LIMIT 25`,
    [classId, rows.map((r) => r.topic_id)],
  );
  return (
    <div>
      <PageHeader
        eyebrow="Teacher workspace"
        title="Class performance"
        description="Topic-wise quiz results to decide what to re-teach. These figures describe practice quizzes only and are not used for any automated decision about a student."
        actions={isPresentation() ? <SampleDataTag /> : undefined}
      />
      <form method="get" className="flex gap-2 items-end mb-5">
        <div>
          <label htmlFor="pf-class" className="label">Class</label>
          <select id="pf-class" name="classId" className="select" defaultValue={classId ?? ""}>
            <option value="">All my classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary">Show</button>
      </form>
      {rows.length ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="ai-card p-5 lg:col-span-2">
            <h2 className="font-bold text-[0.9rem] flex items-center gap-2"><span className="ai-chip">AI</span> Class insights</h2>
            <AiAction
              className="mt-2"
              endpoint="/api/ai/insights"
              body={classId ? { classId } : {}}
              label="Find misconceptions and what to re-teach"
              busyLabel="Analysing quiz answers"
              description="Looks at which questions students got wrong, and which wrong answer they chose most often, to suggest likely misconceptions and next teaching steps. Advice for you only: it never labels students."
            />
          </section>
          <Card title="Average score by topic (lowest first)">
            <BarList
              title="Average quiz score by topic"
              valueLabel="Average"
              max={100}
              data={rows.map((r) => ({ label: `${r.topic} (${r.class_name})`, value: r.avg_percent ?? 0, display: r.avg_percent == null ? "—" : `${r.avg_percent}%`, sub: `${r.students}/${r.class_size} students` }))}
            />
          </Card>
          <Card title="Students who may need support" pad={false}>
            {support.length ? (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Student</th><th>Topic</th><th>Best</th></tr></thead>
                <tbody>
                  {support.map((s, i) => (
                    <tr key={i}><td>{s.name}<p className="text-xs text-muted">{s.class_name}</p></td><td>{s.topic}</td><td><StatusBadge status="needs_support" label={`${s.best}%`} /></td></tr>
                  ))}
                </tbody>
              </table></div>
            ) : (
              <EmptyState title="No student is below 50% on any topic" />
            )}
            <p className="card-pad pt-0 text-xs text-muted">A prompt for a conversation, not a judgement: one quiz is a small sample.</p>
          </Card>
          <Card title="Topic summary" pad={false} className="lg:col-span-2">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Topic</th><th>Class</th><th>Students attempted</th><th>Attempts</th><th>Average</th><th>Band</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const band = masteryBand(r.avg_percent);
                    return (
                      <tr key={`${r.topic_id}-${r.class_id}`}>
                        <td><Link href={`/app/learn/${r.topic_id}`} className="font-semibold">{r.topic}</Link><p className="text-xs text-muted">{r.subject}</p></td>
                        <td>{r.class_name}</td><td>{r.students} / {r.class_size}</td><td>{r.attempts}</td>
                        <td>{r.avg_percent == null ? "—" : `${r.avg_percent}%`}</td>
                        <td><StatusBadge status={band} label={MASTERY_LABEL[band]} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="card"><EmptyState title="No published quizzes yet for these classes" /></div>
      )}
    </div>
  );
}
