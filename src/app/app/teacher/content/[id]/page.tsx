import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, JsonForm } from "@/components/forms";
import { Markdown } from "@/components/Markdown";
import { Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { manageableTopics } from "@/lib/queries";
import { can } from "@/lib/rbac";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermission("content.manage", "content.approve");
  const id = Number((await params).id);
  const db = await getDb();
  const m = await db.one<{ id: number; title: string; body: string; status: string; topic_id: number; topic: string }>(
    "SELECT m.id, m.title, m.body, m.status, m.topic_id, t.name AS topic FROM materials m JOIN topics t ON t.id = m.topic_id WHERE m.id = $1",
    [Number.isInteger(id) ? id : 0],
  );
  if (!m || !(await manageableTopics(user)).some((t) => t.id === m.topic_id)) notFound();
  const history = await db.query<{ from_status: string | null; to_status: string; note: string | null; actor_label: string; created_at: string }>(
    "SELECT from_status, to_status, note, actor_label, created_at FROM status_history WHERE entity = 'material' AND entity_id = $1 ORDER BY created_at DESC",
    [m.id],
  );
  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/teacher/content" className="text-brand font-semibold">← Learning material</Link></p>
      <PageHeader
        eyebrow={m.topic}
        title={m.title}
        actions={
          <>
            <StatusBadge status={m.status} />
            {m.status === "draft" && can(user.role, "content.approve") && (
              <ActionButton endpoint={`/api/materials/${m.id}`} method="PATCH" body={{ action: "approve" }} label="Approve for students" variant="primary" size="md" />
            )}
          </>
        }
      />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card title="Preview (as students will see it)"><Markdown source={m.body} /></Card>
        <div className="space-y-5">
          {can(user.role, "content.manage") && (
            <Card title="Edit">
              <JsonForm endpoint={`/api/materials/${m.id}`} method="PATCH" extra={{ action: "edit" }} submitLabel="Save changes" successMessage="Saved. The material is now a draft awaiting approval.">
                <Field label="Title" htmlFor="e-title"><input id="e-title" name="title" className="input" defaultValue={m.title} required /></Field>
                <Field label="Content" htmlFor="e-body"><textarea id="e-body" name="body" className="textarea" rows={14} defaultValue={m.body} required /></Field>
              </JsonForm>
            </Card>
          )}
          <Card title="History">
            <ul className="space-y-1.5 text-sm">
              {history.length ? history.map((h, i) => (
                <li key={i}><span className="text-muted">{fmtDateTime(h.created_at)}</span> · {h.actor_label}: {h.from_status ?? "—"} → <strong>{h.to_status}</strong>{h.note ? ` (${h.note})` : ""}</li>
              )) : <li className="text-muted">No changes recorded since the presentation data was loaded.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
