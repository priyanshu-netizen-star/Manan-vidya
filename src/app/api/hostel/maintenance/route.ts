import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";

const Request = z.object({
  roomId: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().positive().optional()),
  category: z.enum(["electrical", "plumbing", "furniture", "cleaning", "other"]),
  description: z.string().trim().min(5).max(1000),
  priority: z.enum(["low", "normal", "urgent"]).default("normal"),
});

/** Wardens may raise requests for any room; a boarder only for their own room. */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  const input = await body(req, Request);
  const db = await getDb();
  let roomId = input.roomId;
  if (can(user.role, "hostel.manage")) {
    if (!roomId) throw new ApiError(400, "Choose a room.");
  } else if (user.role === "student" && user.studentId) {
    const own = await db.one<{ room_id: number }>(
      "SELECT b.room_id FROM bed_allocations ba JOIN hostel_beds b ON b.id = ba.bed_id WHERE ba.student_id = $1 AND ba.to_date IS NULL",
      [user.studentId],
    );
    if (!own) throw new ApiError(400, "You do not have a hostel room allocated.");
    roomId = own.room_id;
  } else {
    throw new ApiError(403, "You do not have permission to raise maintenance requests.");
  }
  const row = await db.one<{ id: number }>(
    "INSERT INTO maintenance_requests (room_id, raised_by, category, description, priority, status) VALUES ($1,$2,$3,$4,$5,'open') RETURNING id",
    [roomId, user.id, input.category, input.description, input.priority],
  );
  await recordStatus(db, "maintenance", row!.id, null, "open", "Request raised", { id: user.id, label: user.name });
  await audit(db, user.id, "maintenance.create", "maintenance_request", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
