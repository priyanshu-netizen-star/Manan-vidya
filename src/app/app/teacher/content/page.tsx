import Link from "next/link";
import { ActionButton, JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { levelName, manageableTopics } from "@/lib/queries";
import { can } from "@/lib/rbac";

export const metadata = { title: "Learning material" };

const STATUSES = ["draft", "approved", "archived"] as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireAnyPermission("content.manage", "content.approve");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as never) ? sp.status! : "draft";
  const topics = await manageableTopics(user);
  const db = await getDb();
  const rows = await db.query<{ id: number; title: string; status: string; topic: string; subject: string; class_level: number; author: string | null; updated_at: string; approver: string | null }>(
    `SELECT m.id, m.title, m.status, t.name AS topic, s.name AS subject, t.class_level, u.name AS author, m.updated_at, a.name AS approver
       FROM materials m JOIN topics t ON t.id = m.topic_id JOIN subjects s ON s.id = t.subject_id
       LEFT JOIN users u ON u.id = m.created_by LEFT JOIN users a ON a.id = m.approved_by
      WHERE m.status = $1 AND m.topic_id = ANY($2::int[]) ORDER BY m.updated_at DESC`,
    [status, topics.map((t) => t.id)],
  );
  const canEdit = can(user.role, "content.manage");
  const canApprove = can(user.role, "content.approve");

  return (
    <div>
      <PageHeader
        eyebrow="Teacher workspace"
        title="Learning material"
        description="Students see only approved material. Any edit sends material back to draft for approval."
      />
      <div className="flex gap-1 mb-4" role="tablist" aria-label="Status">
        {STATUSES.map((s) => (
          <Link key={s} href={`/app/teacher/content?status=${s}`} role="tab" aria-selected={s === status} className={`btn btn-sm ${s === status ? "btn-primary" : "btn-secondary"}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_24rem] gap-5 items-start">
        <Card pad={false}>
          {rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Title</th><th>Topic</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/app/teacher/content/${r.id}`} className="font-semibold text-brand">{r.title}</Link>
                        <p className="text-xs text-muted">{r.author ?? "—"} · {fmtDate(r.updated_at)}{r.approver ? ` · approved by ${r.approver}` : ""}</p>
                      </td>
                      <td className="text-sm">{r.topic}<p className="text-xs text-muted">{r.subject} · Class {levelName(r.class_level)}</p></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {r.status === "draft" && canApprove && <ActionButton endpoint={`/api/materials/${r.id}`} method="PATCH" body={{ action: "approve" }} label="Approve" variant="primary" />}
                          {r.status !== "archived" && canEdit && <ActionButton endpoint={`/api/materials/${r.id}`} method="PATCH" body={{ action: "archive" }} label="Archive" confirm="Archive this material? Students will no longer see it." />}
                          {r.status === "archived" && canEdit && <ActionButton endpoint={`/api/materials/${r.id}`} method="PATCH" body={{ action: "restore" }} label="Restore as draft" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={`No ${status} material`}>{status === "draft" ? "Nothing is waiting for approval." : "Nothing here yet."}</EmptyState>
          )}
        </Card>
        {canEdit && (
          <Card title="Write new material">
            <JsonForm endpoint="/api/materials" submitLabel="Save as draft" successMessage="Saved as draft. Approve it to publish to students." resetOnSuccess>
              <Field label="Topic" htmlFor="m-topic">
                <select id="m-topic" name="topicId" className="select" required>
                  {topics.map((t) => <option key={t.id} value={t.id}>Class {levelName(t.class_level)} · {t.subject} · {t.name}</option>)}
                </select>
              </Field>
              <Field label="Title" htmlFor="m-title"><input id="m-title" name="title" className="input" required minLength={3} maxLength={160} /></Field>
              <Field label="Content" htmlFor="m-body" hint="Plain text or Markdown. Leave a blank line between paragraphs. HTML is not allowed.">
                <textarea id="m-body" name="body" className="textarea" rows={10} required minLength={20} />
              </Field>
            </JsonForm>
          </Card>
        )}
      </div>
    </div>
  );
}
