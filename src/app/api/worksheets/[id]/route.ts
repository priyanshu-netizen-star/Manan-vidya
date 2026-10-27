import { z } from "zod";
import { assertTeachesClassTopic } from "@/lib/access";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";

const Patch = z.object({ action: z.enum(["approve", "archive"]) });

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "content.manage");
  const id = intParam((await ctx.params).id);
  const { action } = await body(req, Patch);
  const db = await getDb();
  const w = await db.one<{ topic_id: number; class_id: number; status: string }>("SELECT topic_id, class_id, status FROM worksheets WHERE id = $1", [id]);
  if (!w) throw new ApiError(404, "Worksheet not found");
  await assertTeachesClassTopic(user, w.class_id, w.topic_id);
  if (action === "approve") {
    if (w.status !== "draft") throw new ApiError(409, "Only draft worksheets can be approved.");
    await db.query("UPDATE worksheets SET status = 'approved', approved_by = $2 WHERE id = $1", [id, user.id]);
  } else {
    await db.query("UPDATE worksheets SET status = 'archived' WHERE id = $1", [id]);
  }
  await audit(db, user.id, `worksheet.${action}`, "worksheet", id, {}, clientIp(req));
  return ok();
});
