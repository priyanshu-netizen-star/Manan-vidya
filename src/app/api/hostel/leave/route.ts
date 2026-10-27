import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time");

const Leave = z.object({
  studentId: z.coerce.number().int().positive().optional(),
  kind: z.enum(["leave", "outpass"]),
  departAt: localDateTime,
  returnAt: localDateTime,
  reason: z.string().trim().min(5).max(500),
  destination: z.string().trim().min(2).max(200),
  escortName: z.string().trim().min(2).max(100),
});

/** Times are entered in the school's timezone (IST). */
const ist = (v: string) => new Date(`${v}:00+05:30`);

/**
 * Leave / outpass request. Parents and students may request only for their own (boarder) child;
 * the warden may enter a request on a parent's behalf. Every request needs a warden decision.
 */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  if (!can(user.role, "hostel.request") && !can(user.role, "hostel.manage")) throw new ApiError(403, "You do not have permission to request leave.");
  const input = await body(req, Leave);
  const studentId = can(user.role, "hostel.manage") ? input.studentId : (user.studentId ?? undefined);
  if (!studentId) throw new ApiError(400, "Choose a student.");
  const depart = ist(input.departAt);
  const ret = ist(input.returnAt);
  if (!(ret > depart)) throw new ApiError(400, "The return time must be after the departure time.");
  if (depart.getTime() < Date.now() - 24 * 3600_000) throw new ApiError(400, "Departure cannot be more than a day in the past.");
  if (input.kind === "outpass" && ret.getTime() - depart.getTime() > 24 * 3600_000) throw new ApiError(400, "An outpass is for the same day. Use a leave request for overnight stays.");
  if (ret.getTime() - depart.getTime() > 30 * 24 * 3600_000) throw new ApiError(400, "Leave longer than 30 days must be arranged with the school office.");
  const db = await getDb();
  const s = await db.one<{ is_boarder: boolean }>("SELECT is_boarder FROM students WHERE id = $1 AND status = 'active'", [studentId]);
  if (!s?.is_boarder) throw new ApiError(400, "Leave and outpass requests are only for hostel boarders.");
  const overlap = await db.one(
    "SELECT 1 FROM leave_requests WHERE student_id = $1 AND status IN ('pending','approved','checked_out') AND depart_at < $3 AND return_at > $2",
    [studentId, depart.toISOString(), ret.toISOString()],
  );
  if (overlap) throw new ApiError(409, "There is already an open request for this student that overlaps these dates.");
  const row = await db.one<{ id: number }>(
    `INSERT INTO leave_requests (student_id, requested_by, kind, depart_at, return_at, reason, destination, escort_name, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id`,
    [studentId, user.id, input.kind, depart.toISOString(), ret.toISOString(), input.reason, input.destination, input.escortName],
  );
  await recordStatus(db, "leave", row!.id, null, "pending", "Request submitted", { id: user.id, label: user.name });
  await audit(db, user.id, "leave.create", "leave_request", row!.id, { kind: input.kind }, clientIp(req));
  return ok({ id: row!.id }, 201);
});
