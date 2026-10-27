import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";

const Patch = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(40000),
  status: z.enum(["draft", "reviewed"]),
});

/** Teachers can edit only their own lesson plans. */
export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "ai.teacher_tools");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const plan = await db.one<{ teacher_id: number }>("SELECT teacher_id FROM lesson_plans WHERE id = $1", [id]);
  if (!plan) throw new ApiError(404, "Lesson plan not found");
  if (plan.teacher_id !== user.id && user.role !== "platform_admin") throw new ApiError(403, "You can only edit your own lesson plans.");
  await db.query("UPDATE lesson_plans SET title = $2, content = $3, status = $4, updated_at = now() WHERE id = $1", [id, input.title, input.content, input.status]);
  await audit(db, user.id, "lesson.update", "lesson_plan", id, { status: input.status }, clientIp(req));
  return ok();
});

export const DELETE = route(async (req, ctx) => {
  const user = await apiUser(req, "ai.teacher_tools");
  const id = intParam((await ctx.params).id);
  const db = await getDb();
  const plan = await db.one<{ teacher_id: number }>("SELECT teacher_id FROM lesson_plans WHERE id = $1", [id]);
  if (!plan) throw new ApiError(404, "Lesson plan not found");
  if (plan.teacher_id !== user.id && user.role !== "platform_admin") throw new ApiError(403, "You can only delete your own lesson plans.");
  await db.query("DELETE FROM lesson_plans WHERE id = $1", [id]);
  await audit(db, user.id, "lesson.delete", "lesson_plan", id, {}, clientIp(req));
  return ok();
});
