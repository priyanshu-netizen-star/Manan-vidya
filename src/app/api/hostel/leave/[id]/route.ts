import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";
import { LEAVE_FLOW, LEAVE_STATUSES, canTransition, type LeaveStatus } from "@/lib/workflows";

const Patch = z.object({ to: z.enum(LEAVE_STATUSES), note: z.string().trim().max(500).default("") });

/**
 * Leave decisions are made by a person (the warden), never automatically.
 * The requester (or the student's parent) may only cancel a request that is still pending.
 */
export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req);
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const l = await db.one<{ status: LeaveStatus; student_id: number }>("SELECT status, student_id FROM leave_requests WHERE id = $1", [id]);
  if (!l) throw new ApiError(404, "Request not found");

  if (can(user.role, "hostel.manage")) {
    if (!canTransition(LEAVE_FLOW, l.status, input.to)) throw new ApiError(409, `A request cannot move from "${l.status}" to "${input.to}".`);
    if (input.to === "rejected" && !input.note) throw new ApiError(400, "Give a reason when rejecting, so the parent understands the decision.");
  } else if (can(user.role, "hostel.request") && user.studentId === l.student_id) {
    if (!(l.status === "pending" && input.to === "cancelled")) throw new ApiError(403, "You can only cancel a request that is still awaiting the warden.");
  } else {
    throw new ApiError(403, "You do not have permission to change this request.");
  }

  const decision = input.to === "approved" || input.to === "rejected";
  await db.query(
    `UPDATE leave_requests SET status = $2, updated_at = now(),
            decided_by = CASE WHEN $3 THEN $4 ELSE decided_by END,
            decision_note = CASE WHEN $3 THEN $5 ELSE decision_note END WHERE id = $1`,
    [id, input.to, decision, user.id, input.note || null],
  );
  await recordStatus(db, "leave", id, l.status, input.to, input.note || null, { id: user.id, label: user.name });
  await audit(db, user.id, `leave.${input.to}`, "leave_request", id, {}, clientIp(req));
  return ok();
});
