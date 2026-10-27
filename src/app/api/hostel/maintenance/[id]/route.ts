import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { MAINT_FLOW, MAINT_STATUSES, canTransition, type MaintStatus } from "@/lib/workflows";

const Patch = z.object({
  to: z.enum(MAINT_STATUSES),
  assignedTo: z.string().trim().max(100).default(""),
  note: z.string().trim().max(500).default(""),
});

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "hostel.manage");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const m = await db.one<{ status: MaintStatus; assigned_to: string | null }>("SELECT status, assigned_to FROM maintenance_requests WHERE id = $1", [id]);
  if (!m) throw new ApiError(404, "Request not found");
  if (!canTransition(MAINT_FLOW, m.status, input.to)) throw new ApiError(409, `A request cannot move from "${m.status}" to "${input.to}".`);
  await db.query("UPDATE maintenance_requests SET status = $2, assigned_to = $3, updated_at = now() WHERE id = $1", [id, input.to, input.assignedTo || m.assigned_to]);
  await recordStatus(db, "maintenance", id, m.status, input.to, [input.assignedTo && `Assigned to ${input.assignedTo}`, input.note].filter(Boolean).join(". ") || null, { id: user.id, label: user.name });
  await audit(db, user.id, "maintenance.status", "maintenance_request", id, { to: input.to }, clientIp(req));
  return ok();
});
