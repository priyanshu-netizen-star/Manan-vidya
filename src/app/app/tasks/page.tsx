import Link from "next/link";
import { JsonForm } from "@/components/forms";
import { Badge, Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDateTime, todayIST } from "@/lib/dates";
import { TASK_FLOW, TASK_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/workflows";

export const metadata = { title: "Tasks" };

const MODULES = ["administration", "academics", "admissions", "examinations", "hostel", "it"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const user = await requirePageUser("tasks.manage");
  const sp = await searchParams;
  const view = sp.view === "all" && ["management", "platform_admin", "office_admin"].includes(user.role) ? "all" : "mine";
  const status = TASK_STATUSES.includes(sp.status as TaskStatus) ? sp.status! : "active";
  const db = await getDb();
  const tasks = await db.query<{
    id: number; title: string; description: string; module: string; priority: string; status: TaskStatus; due_date: string | null;
    assignee: string | null; assignee_id: number | null; creator: string | null; created_by: number | null; updated_at: string;
  }>(
    `SELECT t.id, t.title, t.description, t.module, t.priority, t.status, t.due_date, a.name AS assignee, t.assignee_id, c.name AS creator, t.created_by, t.updated_at
       FROM tasks t LEFT JOIN users a ON a.id = t.assignee_id LEFT JOIN users c ON c.id = t.created_by
      WHERE ($1 = 'all' OR t.assignee_id = $2 OR t.created_by = $2)
        AND (($3 = 'active' AND t.status <> 'done') OR t.status = $3)
      ORDER BY (t.priority = 'high') DESC, t.due_date NULLS LAST, t.id DESC`,
    [view, user.id, status],
  );
  const staff = await db.query<{ id: number; name: string; role: string }>("SELECT id, name, role FROM users WHERE active AND role NOT IN ('student','parent') ORDER BY name");
  const today = todayIST();
  const canSeeAll = ["management", "platform_admin", "office_admin"].includes(user.role);
  const q = (o: Record<string, string>) => `/app/tasks?${new URLSearchParams({ view, status, ...o })}`;

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Tasks" description="Track administrative work across departments. Every status change is recorded with who made it." />
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href={q({ view: "mine" })} className={`btn btn-sm ${view === "mine" ? "btn-primary" : "btn-secondary"}`}>My tasks</Link>
        {canSeeAll && <Link href={q({ view: "all" })} className={`btn btn-sm ${view === "all" ? "btn-primary" : "btn-secondary"}`}>All tasks</Link>}
        <span className="w-px bg-line mx-1" />
        <Link href={q({ status: "active" })} className={`btn btn-sm ${status === "active" ? "btn-primary" : "btn-secondary"}`}>Not done</Link>
        {TASK_STATUSES.map((s) => <Link key={s} href={q({ status: s })} className={`btn btn-sm ${status === s ? "btn-primary" : "btn-secondary"}`}>{TASK_LABEL[s]}</Link>)}
      </div>
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-3">
          {tasks.length ? tasks.map((t) => {
            const overdue = t.due_date && t.due_date < today && t.status !== "done";
            return (
              <article key={t.id} className="card card-pad">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold flex-1 min-w-[12rem]">{t.title}</h2>
                  {t.priority === "high" && <Badge tone="bad">High priority</Badge>}
                  <Badge>{t.module}</Badge>
                  <StatusBadge status={t.status} label={TASK_LABEL[t.status]} />
                </div>
                {t.description && <p className="text-sm text-ink-2 mt-1">{t.description}</p>}
                <p className={`text-xs mt-2 ${overdue ? "text-bad font-semibold" : "text-muted"}`}>
                  {t.assignee ? `Assigned to ${t.assignee}` : "Unassigned"} · due {fmtDate(t.due_date)}{overdue ? " (overdue)" : ""} · by {t.creator ?? "—"} · updated {fmtDateTime(t.updated_at)}
                </p>
                {TASK_FLOW[t.status].length > 0 && (
                  <JsonForm endpoint={`/api/tasks/${t.id}`} method="PATCH" className="mt-3 flex flex-wrap gap-2 items-center" submitLabel="Update" successMessage="Updated.">
                    <label className="sr-only" htmlFor={`tk-${t.id}`}>New status</label>
                    <select id={`tk-${t.id}`} name="to" className="select !w-auto">{TASK_FLOW[t.status].map((s) => <option key={s} value={s}>{TASK_LABEL[s]}</option>)}</select>
                    <label className="sr-only" htmlFor={`tkn-${t.id}`}>Note</label>
                    <input id={`tkn-${t.id}`} name="note" className="input !w-auto flex-1 min-w-[10rem]" placeholder="Note (required if blocked)" />
                  </JsonForm>
                )}
              </article>
            );
          }) : <div className="card"><EmptyState title="No tasks here" /></div>}
        </div>
        <Card title="New task">
          <JsonForm endpoint="/api/tasks" submitLabel="Create task" successMessage="Task created." resetOnSuccess>
            <Field label="Title" htmlFor="nt-title"><input id="nt-title" name="title" className="input" required minLength={3} /></Field>
            <Field label="Details" htmlFor="nt-desc"><textarea id="nt-desc" name="description" className="textarea" rows={3} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Area" htmlFor="nt-mod"><select id="nt-mod" name="module" className="select">{MODULES.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
              <Field label="Priority" htmlFor="nt-pri"><select id="nt-pri" name="priority" className="select" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></Field>
            </div>
            <Field label="Assign to" htmlFor="nt-as">
              <select id="nt-as" name="assigneeId" className="select" defaultValue={user.id}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label="Due date" htmlFor="nt-due"><input id="nt-due" name="dueDate" type="date" className="input" /></Field>
          </JsonForm>
        </Card>
      </div>
    </div>
  );
}
