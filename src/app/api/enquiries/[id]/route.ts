import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { optionalDate } from "@/lib/schemas";
import { ENQUIRY_FLOW, ENQUIRY_STATUSES, canTransition, type EnquiryStatus } from "@/lib/workflows";

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), to: z.enum(ENQUIRY_STATUSES), note: z.string().trim().max(1000).default("") }),
  z.object({ action: z.literal("assign"), assigneeId: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()) }),
  z.object({ action: z.literal("follow_up"), date: optionalDate }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(2).max(1000) }),
  z.object({ action: z.literal("resolve_escalation"), note: z.string().trim().min(2).max(1000) }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "enquiry.manage");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const e = await db.one<{ status: EnquiryStatus; escalated: boolean }>("SELECT status, escalated FROM enquiries WHERE id = $1", [id]);
  if (!e) throw new ApiError(404, "Enquiry not found");
  const actor = { id: user.id, label: user.name };

  switch (input.action) {
    case "status": {
      if (!canTransition(ENQUIRY_FLOW, e.status, input.to)) throw new ApiError(409, `An enquiry cannot move from "${e.status}" to "${input.to}".`);
      if (input.to === "admitted" && !input.note) throw new ApiError(400, "Add a note confirming the admission (e.g. admission number issued by the office).");
      const done = input.to === "admitted" || input.to === "closed";
      await db.query(
        `UPDATE enquiries SET status = $2, updated_at = now(), next_follow_up = CASE WHEN $3 THEN NULL ELSE next_follow_up END,
                assigned_to = coalesce(assigned_to, $4) WHERE id = $1`,
        [id, input.to, done, user.id],
      );
      await recordStatus(db, "enquiry", id, e.status, input.to, input.note || null, actor);
      break;
    }
    case "assign": {
      if (input.assigneeId) {
        const staff = await db.one("SELECT 1 FROM users WHERE id = $1 AND active AND role IN ('office_admin','management','platform_admin')", [input.assigneeId]);
        if (!staff) throw new ApiError(400, "Enquiries can only be assigned to admissions or management staff.");
      }
      await db.query("UPDATE enquiries SET assigned_to = $2, updated_at = now() WHERE id = $1", [id, input.assigneeId]);
      await recordStatus(db, "enquiry", id, null, null, input.assigneeId ? "Assigned to a staff member" : "Unassigned", actor);
      break;
    }
    case "follow_up":
      await db.query("UPDATE enquiries SET next_follow_up = $2, updated_at = now() WHERE id = $1", [id, input.date]);
      await recordStatus(db, "enquiry", id, null, null, input.date ? `Follow-up set for ${input.date}` : "Follow-up cleared", actor);
      break;
    case "note":
      await recordStatus(db, "enquiry", id, null, null, input.note, actor);
      break;
    case "resolve_escalation":
      if (!e.escalated) throw new ApiError(409, "This enquiry is not escalated.");
      await db.query("UPDATE enquiries SET escalated = FALSE, updated_at = now() WHERE id = $1", [id]);
      await recordStatus(db, "enquiry", id, null, null, `Escalation handled: ${input.note}`, actor);
      break;
  }
  await audit(db, user.id, `enquiry.${input.action}`, "enquiry", id, {}, clientIp(req));
  return ok();
});
