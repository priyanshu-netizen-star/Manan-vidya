import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";

const Patch = z.object({ action: z.enum(["lock", "unlock"]) });

/** Locking an exam freezes its marks so report cards cannot change after release. */
export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "exams.manage");
  const id = intParam((await ctx.params).id);
  const { action } = await body(req, Patch);
  const db = await getDb();
  const exam = await db.one("SELECT 1 FROM exams WHERE id = $1", [id]);
  if (!exam) throw new ApiError(404, "Exam not found");
  await db.query("UPDATE exams SET status = $2 WHERE id = $1", [id, action === "lock" ? "locked" : "open"]);
  await audit(db, user.id, `exam.${action}`, "exam", id, {}, clientIp(req));
  return ok();
});
