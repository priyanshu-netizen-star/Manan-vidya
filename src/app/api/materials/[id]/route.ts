import { z } from "zod";
import { assertTopicManage } from "@/lib/access";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), title: z.string().trim().min(3).max(160), body: z.string().trim().min(20).max(20000) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("restore") }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req);
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const m = await db.one<{ id: number; topic_id: number; status: string }>("SELECT id, topic_id, status FROM materials WHERE id = $1", [id]);
  if (!m) throw new ApiError(404, "Material not found");
  const label = { id: user.id, label: user.name };

  if (input.action === "approve") {
    if (!can(user.role, "content.approve")) throw new ApiError(403, "You do not have permission to approve material.");
    await assertTopicManage(user, m.topic_id, "approve");
    if (m.status !== "draft") throw new ApiError(409, "Only draft material can be approved.");
    await db.query("UPDATE materials SET status = 'approved', approved_by = $2, approved_at = now(), updated_at = now() WHERE id = $1", [id, user.id]);
  } else {
    if (!can(user.role, "content.manage")) throw new ApiError(403, "You do not have permission to edit material.");
    await assertTopicManage(user, m.topic_id);
    if (input.action === "edit") {
      // Any edit sends the material back for approval.
      await db.query("UPDATE materials SET title = $2, body = $3, status = 'draft', approved_by = NULL, approved_at = NULL, updated_at = now() WHERE id = $1", [id, input.title, input.body]);
    } else if (input.action === "archive") {
      await db.query("UPDATE materials SET status = 'archived', updated_at = now() WHERE id = $1", [id]);
    } else {
      if (m.status !== "archived") throw new ApiError(409, "Only archived material can be restored.");
      await db.query("UPDATE materials SET status = 'draft', updated_at = now() WHERE id = $1", [id]);
    }
  }
  const to = input.action === "approve" ? "approved" : input.action === "archive" ? "archived" : "draft";
  await recordStatus(db, "material", id, m.status, to, input.action === "edit" ? "Edited" : null, label);
  await audit(db, user.id, `material.${input.action}`, "material", id, {}, clientIp(req));
  return ok();
});
