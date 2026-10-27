import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { hashPassword, passwordProblem } from "@/lib/password";
import { ROLES } from "@/lib/rbac";

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(ROLES) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("password"), password: z.string().min(1).max(200) }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "users.manage");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const target = await db.one<{ role: string; student_id: number | null }>("SELECT role, student_id FROM users WHERE id = $1", [id]);
  if (!target) throw new ApiError(404, "User not found");
  const removingAdmin = target.role === "platform_admin" && (input.action === "deactivate" || (input.action === "role" && input.role !== "platform_admin"));
  if (removingAdmin) {
    const admins = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM users WHERE role = 'platform_admin' AND active", []);
    if ((admins?.n ?? 0) <= 1) throw new ApiError(409, "This is the last active platform administrator.");
  }
  if (id === user.id && input.action !== "password") throw new ApiError(409, "You cannot change your own role or deactivate yourself.");

  switch (input.action) {
    case "role":
      if ((input.role === "student" || input.role === "parent") && !target.student_id) throw new ApiError(400, "Link a student record before giving this role.");
      await db.query("UPDATE users SET role = $2 WHERE id = $1", [id, input.role]);
      await db.query("DELETE FROM sessions WHERE user_id = $1", [id]); // force re-login with new permissions
      break;
    case "activate":
      await db.query("UPDATE users SET active = TRUE, failed_logins = 0, locked_until = NULL WHERE id = $1", [id]);
      break;
    case "deactivate":
      await db.query("UPDATE users SET active = FALSE WHERE id = $1", [id]);
      await db.query("DELETE FROM sessions WHERE user_id = $1", [id]);
      break;
    case "password": {
      const problem = passwordProblem(input.password);
      if (problem) throw new ApiError(400, problem);
      await db.query("UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1", [id, await hashPassword(input.password)]);
      await db.query("DELETE FROM sessions WHERE user_id = $1", [id]);
      break;
    }
  }
  await audit(db, user.id, `user.${input.action}`, "user", id, input.action === "role" ? { role: input.role } : {}, clientIp(req));
  return ok();
});
