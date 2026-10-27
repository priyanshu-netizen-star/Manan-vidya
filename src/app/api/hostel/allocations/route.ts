import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";

const Allocate = z.object({ studentId: z.coerce.number().int().positive(), bedId: z.coerce.number().int().positive() });

/** Allocates a free bed. If the student already has a bed, that allocation is ended (a room move). */
export const POST = route(async (req) => {
  const user = await apiUser(req, "hostel.manage");
  const { studentId, bedId } = await body(req, Allocate);
  const db = await getDb();
  const s = await db.one<{ is_boarder: boolean; gender: string }>("SELECT is_boarder, gender FROM students WHERE id = $1 AND status = 'active'", [studentId]);
  if (!s?.is_boarder) throw new ApiError(400, "Only active boarders can be given a bed. Mark the student as a boarder first.");
  const bed = await db.one<{ block: string }>("SELECT r.block FROM hostel_beds b JOIN hostel_rooms r ON r.id = b.room_id WHERE b.id = $1", [bedId]);
  if (!bed) throw new ApiError(404, "Bed not found");
  if ((bed.block.startsWith("Girls") && s.gender === "M") || (bed.block.startsWith("Boys") && s.gender === "F")) {
    throw new ApiError(400, "This bed is in a block for a different group of students.");
  }
  const today = todayIST();
  await db.tx(async (q) => {
    const taken = await q.query("SELECT 1 FROM bed_allocations WHERE bed_id = $1 AND to_date IS NULL", [bedId]);
    if (taken.length) throw new ApiError(409, "That bed is already occupied.");
    await q.query("UPDATE bed_allocations SET to_date = $2 WHERE student_id = $1 AND to_date IS NULL", [studentId, today]);
    await q.query("INSERT INTO bed_allocations (bed_id, student_id, from_date, allocated_by) VALUES ($1,$2,$3,$4)", [bedId, studentId, today, user.id]);
  });
  await audit(db, user.id, "hostel.allocate", "student", studentId, { bedId }, clientIp(req));
  return ok({}, 201);
});
