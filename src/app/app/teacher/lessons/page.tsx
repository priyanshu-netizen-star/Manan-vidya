import Link from "next/link";
import { JsonForm } from "@/components/forms";
import { Badge, Card, EmptyState, Field, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { teachOptions } from "@/lib/queries";

export const metadata = { title: "Lesson preparation" };

export default async function LessonsPage() {
  const user = await requirePageUser("ai.teacher_tools");
  const options = await teachOptions(user);
  const db = await getDb();
  const plans = await db.query<{ id: number; title: string; status: string; generation: string; class_name: string; updated_at: string }>(
    `SELECT lp.id, lp.title, lp.status, lp.generation, c.name AS class_name, lp.updated_at
       FROM lesson_plans lp JOIN classes c ON c.id = lp.class_id WHERE lp.teacher_id = $1 ORDER BY lp.updated_at DESC`,
    [user.id],
  );
  const ai = aiConfigured();
  return (
    <div>
      <PageHeader
        eyebrow="Teacher workspace"
        title="Lesson preparation"
        description="Get a first draft of a lesson plan built from your school's approved material, then edit it and mark it reviewed. Plans are private to you."
      />
      <div className="grid lg:grid-cols-[1fr_24rem] gap-5 items-start">
        <Card title="My lesson plans" pad={false}>
          {plans.length ? (
            <div className="table-wrap"><table className="table">
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/app/teacher/lessons/${p.id}`} className="font-semibold text-brand">{p.title}</Link><p className="text-xs text-muted">{p.class_name} · {fmtDate(p.updated_at)}</p></td>
                    <td><Badge tone={p.generation === "ai" ? "brand" : "default"}>{p.generation === "ai" ? "AI draft" : p.generation === "template" ? "Template" : "Manual"}</Badge></td>
                    <td><StatusBadge status={p.status} label={p.status === "draft" ? "needs review" : "reviewed"} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <EmptyState title="No lesson plans yet">Use the form to prepare your first one.</EmptyState>
          )}
        </Card>
        <Card title="Prepare a lesson">
          <div className="mb-3">
            <Notice tone={ai ? "info" : "warn"}>
              {ai
                ? "The AI assistant drafts the plan from approved material. Always review it before teaching."
                : "AI is not configured for this deployment. A structured template is built from approved material and the question bank instead, and it is labelled as a template."}
            </Notice>
          </div>
          <JsonForm endpoint="/api/lessons" submitLabel={ai ? "Draft with AI" : "Build template"} redirectTo="/app/teacher/lessons/{id}">
            <Field label="Class and topic" htmlFor="lp-ct">
              <select id="lp-ct" name="classTopic" className="select" required>
                {options.map((o) => <option key={`${o.class_id}:${o.topic_id}`} value={`${o.class_id}:${o.topic_id}`}>{o.class_name} · {o.subject} · {o.topic}</option>)}
              </select>
            </Field>
            <Field label="Lesson length (minutes)" htmlFor="lp-min"><input id="lp-min" name="minutes" type="number" min={20} max={120} defaultValue={40} className="input" /></Field>
            <Field label="Focus (optional)" htmlFor="lp-focus" hint="e.g. revise after a weak quiz result, or include a hands-on activity">
              <textarea id="lp-focus" name="focus" className="textarea" rows={2} maxLength={400} />
            </Field>
          </JsonForm>
        </Card>
      </div>
    </div>
  );
}
