import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { TASK_FLOW, TASK_STATUSES, canTransition, type TaskStatus } from "@/lib/workflows";

const Patch = z.object({ to: z.enum(TASK_STATUSES), note: z.string().trim().max(500).default("") });

/** Status changes: the assignee, the creator, management or the platform admin may update a task. */
export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "tasks.manage");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const t = await db.one<{ status: TaskStatus; assignee_id: number | null; created_by: number | null }>("SELECT status, assignee_id, created_by FROM tasks WHERE id = $1", [id]);
  if (!t) throw new ApiError(404, "Task not found");
  const mayEdit = t.assignee_id === user.id || t.created_by === user.id || t.assignee_id === null || ["management", "platform_admin"].includes(user.role);
  if (!mayEdit) throw new ApiError(403, "Only the assignee, the creator or management can update this task.");
  if (!canTransition(TASK_FLOW, t.status, input.to)) throw new ApiError(409, `A task cannot move from "${t.status}" to "${input.to}".`);
  if (input.to === "blocked" && !input.note) throw new ApiError(400, "Say what is blocking the task.");
  await db.query("UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1", [id, input.to]);
  await recordStatus(db, "task", id, t.status, input.to, input.note || null, { id: user.id, label: user.name });
  await audit(db, user.id, "task.status", "task", id, { to: input.to }, clientIp(req));
  return ok();
});
