import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, JsonForm } from "@/components/forms";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const metadata = { title: "Lesson plan" };

export default async function LessonPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("ai.teacher_tools");
  const id = Number((await params).id);
  const db = await getDb();
  const p = await db.one<{ id: number; title: string; content: string; status: string; generation: string; teacher_id: number }>(
    "SELECT id, title, content, status, generation, teacher_id FROM lesson_plans WHERE id = $1",
    [Number.isInteger(id) ? id : 0],
  );
  if (!p || (p.teacher_id !== user.id && user.role !== "platform_admin")) notFound();
  return (
    <div>
      <p className="text-sm mb-2 no-print"><Link href="/app/teacher/lessons" className="text-brand font-semibold">← Lesson plans</Link></p>
      <PageHeader
        title={p.title}
        actions={
          <>
            <Badge tone={p.generation === "ai" ? "brand" : "default"}>{p.generation === "ai" ? "Drafted by AI" : p.generation === "template" ? "Template from approved material" : "Written by teacher"}</Badge>
            <Badge tone={p.status === "reviewed" ? "good" : "warn"}>{p.status === "reviewed" ? "Reviewed by teacher" : "Needs your review"}</Badge>
            <PrintButton />
            <ActionButton endpoint={`/api/lessons/${p.id}`} method="DELETE" label="Delete" variant="danger" confirm="Delete this lesson plan?" redirectTo="/app/teacher/lessons" />
          </>
        }
      />
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        <Card title="Plan"><Markdown source={p.content} /></Card>
        <Card title="Edit" className="no-print">
          <JsonForm endpoint={`/api/lessons/${p.id}`} method="PATCH" submitLabel="Save" successMessage="Saved.">
            <Field label="Title" htmlFor="lp-t"><input id="lp-t" name="title" className="input" defaultValue={p.title} required /></Field>
            <Field label="Content (Markdown)" htmlFor="lp-c"><textarea id="lp-c" name="content" className="textarea font-mono text-xs" rows={24} defaultValue={p.content} required /></Field>
            <Field label="Status" htmlFor="lp-s">
              <select id="lp-s" name="status" className="select" defaultValue={p.status}>
                <option value="draft">Draft: still checking</option>
                <option value="reviewed">Reviewed: I have checked this plan</option>
              </select>
            </Field>
          </JsonForm>
        </Card>
      </div>
    </div>
  );
}
