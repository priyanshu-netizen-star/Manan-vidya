import { ActionButton, JsonForm } from "@/components/forms";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { PERMISSIONS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type Permission } from "@/lib/rbac";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requirePageUser("users.manage");
  const db = await getDb();
  const users = await db.query<{ id: number; email: string; name: string; role: (typeof ROLES)[number]; active: boolean; student: string | null; last_login: string | null; seeded: boolean; locked_until: string | null }>(
    `SELECT u.id, u.email, u.name, u.role, u.active, s.name AS student, u.seeded, u.locked_until,
            (SELECT max(created_at) FROM audit_log a WHERE a.actor_id = u.id AND a.action LIKE 'auth.%login') AS last_login
       FROM users u LEFT JOIN students s ON s.id = u.student_id ORDER BY u.active DESC, u.role, u.name`,
  );
  const students = await db.query<{ id: number; name: string; class_name: string }>("SELECT s.id, s.name, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status = 'active' ORDER BY c.level, s.name");
  return (
    <div>
      <PageHeader eyebrow="Platform" title="Users and roles" description="Create accounts, assign roles and deactivate access. Changing a role signs the user out so new permissions apply immediately." />
      <div className="grid xl:grid-cols-[1fr_22rem] gap-5 items-start">
        <Card pad={false}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Last sign-in</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td>
                      <p className="font-semibold">{u.name} {u.seeded && <Badge tone="warn">Sample</Badge>} {!u.active && <Badge tone="bad">Deactivated</Badge>}</p>
                      <p className="text-xs text-muted">{u.email}{u.student ? ` · linked to ${u.student}` : ""}</p>
                    </td>
                    <td>
                      {u.id === me.id ? ROLE_LABELS[u.role] : (
                        <JsonForm endpoint={`/api/users/${u.id}`} method="PATCH" extra={{ action: "role" }} className="flex gap-1.5 items-center" submitLabel="Set" successMessage="Role updated.">
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Role</label>
                          <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="select !w-auto !py-1 text-xs">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                        </JsonForm>
                      )}
                    </td>
                    <td className="text-xs">{u.last_login ? fmtDateTime(u.last_login) : "Never"}</td>
                    <td>
                      {u.id !== me.id && (u.active
                        ? <ActionButton endpoint={`/api/users/${u.id}`} method="PATCH" body={{ action: "deactivate" }} label="Deactivate" variant="danger" confirm={`Deactivate ${u.name}? They are signed out immediately.`} />
                        : <ActionButton endpoint={`/api/users/${u.id}`} method="PATCH" body={{ action: "activate" }} label="Reactivate" />)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Create an account">
            <JsonForm endpoint="/api/users" submitLabel="Create account" successMessage="Account created. Share the password securely and ask the user to keep it private." resetOnSuccess>
              <Field label="Full name" htmlFor="nu-name"><input id="nu-name" name="name" className="input" required /></Field>
              <Field label="Email" htmlFor="nu-email"><input id="nu-email" name="email" type="email" className="input" required /></Field>
              <Field label="Role" htmlFor="nu-role"><select id="nu-role" name="role" className="select">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
              <Field label="Linked student (students and parents only)" htmlFor="nu-st">
                <select id="nu-st" name="studentId" className="select"><option value="">None</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>)}</select>
              </Field>
              <Field label="Initial password" htmlFor="nu-pw" hint="At least 10 characters with letters and numbers."><input id="nu-pw" name="password" type="password" className="input" required minLength={10} autoComplete="new-password" /></Field>
            </JsonForm>
          </Card>
          <Card title="What each role can do">
            <div className="space-y-3 text-xs">
              {ROLES.map((r) => (
                <details key={r}>
                  <summary className="font-semibold cursor-pointer text-sm">{ROLE_LABELS[r]}</summary>
                  <ul className="mt-1 ml-4 list-disc text-ink-2">{ROLE_PERMISSIONS[r].map((p: Permission) => <li key={p}>{PERMISSIONS[p]}</li>)}</ul>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
