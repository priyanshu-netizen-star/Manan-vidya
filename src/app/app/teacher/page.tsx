import Link from "next/link";
import { JsonForm } from "@/components/forms";
import { Card, Field, PageHeader, Stat } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { levelName, manageableTopics, teacherClasses } from "@/lib/queries";

export const metadata = { title: "Teacher workspace" };

export default async function TeacherHome() {
  const user = await requirePageUser("content.manage");
  const db = await getDb();
  const classes = await teacherClasses(user.id);
  const topics = await manageableTopics(user);
  const topicIds = topics.map((t) => t.id);
  const counts = await db.one<{ draft_materials: number; draft_questions: number; ai_drafts: number; draft_quizzes: number; attempts_7d: number }>(
    `SELECT (SELECT count(*)::int FROM materials WHERE status = 'draft' AND topic_id = ANY($1::int[])) AS draft_materials,
            (SELECT count(*)::int FROM questions WHERE status = 'draft' AND topic_id = ANY($1::int[])) AS draft_questions,
            (SELECT count(*)::int FROM questions WHERE status = 'draft' AND source = 'ai_draft' AND topic_id = ANY($1::int[])) AS ai_drafts,
            (SELECT count(*)::int FROM quizzes WHERE status = 'draft' AND topic_id = ANY($1::int[])) AS draft_quizzes,
            (SELECT count(*)::int FROM quiz_attempts a JOIN quizzes qz ON qz.id = a.quiz_id
              WHERE qz.topic_id = ANY($1::int[]) AND a.submitted_at > now() - interval '7 days') AS attempts_7d`,
    [topicIds],
  );
  const subjects = await db.query<{ id: number; name: string }>(
    user.role === "platform_admin"
      ? "SELECT id, name FROM subjects ORDER BY name"
      : "SELECT DISTINCT s.id, s.name FROM subjects s JOIN teaching_assignments ta ON ta.subject_id = s.id WHERE ta.teacher_id = $1 ORDER BY s.name",
    user.role === "platform_admin" ? [] : [user.id],
  );
  const byClass = new Map<string, string[]>();
  for (const c of classes) byClass.set(c.class_name, [...(byClass.get(c.class_name) ?? []), c.subject]);

  return (
    <div>
      <PageHeader eyebrow="Teacher workspace" title="Your classes and content" description="Prepare material, build question banks and quizzes, publish to your classes, and review results." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Material to approve" value={counts?.draft_materials ?? 0} />
        <Stat label="Questions to review" value={counts?.draft_questions ?? 0} sub={counts?.ai_drafts ? `${counts.ai_drafts} drafted by AI` : undefined} />
        <Stat label="Draft quizzes" value={counts?.draft_quizzes ?? 0} />
        <Stat label="Quiz attempts (7 days)" value={counts?.attempts_7d ?? 0} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card title="Classes and subjects" pad={false}>
          {byClass.size ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Class</th><th>Subjects you teach</th></tr></thead>
              <tbody>
                {[...byClass.entries()].map(([c, subs]) => (
                  <tr key={c}><td className="font-semibold">{c}</td><td>{subs.join(", ")}</td></tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <p className="card-pad text-sm text-muted">No teaching assignments yet. The office assigns classes and subjects.</p>
          )}
        </Card>
        <Card title="Quick actions">
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ["/app/teacher/content", "Write or approve material"],
              ["/app/teacher/questions", "Build the question bank"],
              ["/app/teacher/quizzes", "Create and publish a quiz"],
              ["/app/teacher/worksheets", "Make a printable worksheet"],
              ["/app/teacher/lessons", "Prepare a lesson plan"],
              ["/app/teacher/performance", "Review class performance"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="btn btn-secondary justify-start">{label}</Link>
            ))}
          </div>
        </Card>
        <Card title="Add a topic">
          <JsonForm endpoint="/api/topics" submitLabel="Add topic" successMessage="Topic added." resetOnSuccess>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Subject" htmlFor="t-sub">
                <select id="t-sub" name="subjectId" className="select" required>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Class level" htmlFor="t-lvl">
                <select id="t-lvl" name="classLevel" className="select" required>
                  {[...new Set(classes.map((c) => c.level).concat(user.role === "platform_admin" ? [6, 7, 8] : []))].sort().map((l) => (
                    <option key={l} value={l}>Class {levelName(l)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Topic name" htmlFor="t-name"><input id="t-name" name="name" className="input" required minLength={2} maxLength={120} /></Field>
            <Field label="Short summary" htmlFor="t-sum"><input id="t-sum" name="summary" className="input" maxLength={400} /></Field>
          </JsonForm>
        </Card>
        <Card title="Topics you manage" pad={false}>
          <div className="max-h-80 overflow-y-auto">
            <div className="table-wrap"><table className="table">
              <tbody>
                {topics.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/app/learn/${t.id}`} className="font-semibold text-brand">{t.name}</Link></td>
                    <td className="text-muted">{t.subject} · Class {levelName(t.class_level)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
