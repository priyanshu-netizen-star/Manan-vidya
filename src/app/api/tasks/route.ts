import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { TaskInput } from "@/lib/schemas";

export const POST = route(async (req) => {
  const user = await apiUser(req, "tasks.manage");
  const t = await body(req, TaskInput);
  const db = await getDb();
  if (t.assigneeId && !(await db.one("SELECT 1 FROM users WHERE id = $1 AND active AND role NOT IN ('student','parent')", [t.assigneeId]))) {
    throw new ApiError(400, "Tasks can only be assigned to active staff accounts.");
  }
  const row = await db.one<{ id: number }>(
    "INSERT INTO tasks (title, description, module, priority, status, assignee_id, created_by, due_date) VALUES ($1,$2,$3,$4,'open',$5,$6,$7) RETURNING id",
    [t.title, t.description, t.module, t.priority, t.assigneeId, user.id, t.dueDate],
  );
  await recordStatus(db, "task", row!.id, null, "open", "Task created", { id: user.id, label: user.name });
  await audit(db, user.id, "task.create", "task", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
