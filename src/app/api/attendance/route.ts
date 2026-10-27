import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { requiredDate } from "@/lib/schemas";

const Mark = z.object({
  classId: z.coerce.number().int().positive(),
  date: requiredDate,
  entries: z.array(z.object({ studentId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]) })).min(1).max(100),
});

/** Saves a class register for one day (upsert). Teachers may mark only classes they teach. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "attendance.mark");
  const input = await body(req, Mark);
  if (input.date > todayIST()) throw new ApiError(400, "Attendance cannot be marked for a future date.");
  const db = await getDb();
  if (user.role === "teacher") {
    const teaches = await db.one("SELECT 1 FROM teaching_assignments WHERE teacher_id = $1 AND class_id = $2", [user.id, input.classId]);
    if (!teaches) throw new ApiError(403, "You can only mark attendance for classes you teach.");
  }
  const ids = input.entries.map((e) => e.studentId);
  const inClass = await db.query<{ id: number }>("SELECT id FROM students WHERE id = ANY($1::int[]) AND class_id = $2 AND status = 'active'", [ids, input.classId]);
  if (inClass.length !== new Set(ids).size) throw new ApiError(400, "Every student must belong to the selected class.");
  await db.tx(async (q) => {
    for (const e of input.entries) {
      await q.query(
        `INSERT INTO attendance (student_id, date, status, marked_by) VALUES ($1,$2,$3,$4)
         ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = now()`,
        [e.studentId, input.date, e.status, user.id],
      );
    }
  });
  await audit(db, user.id, "attendance.mark", "class", input.classId, { date: input.date, count: input.entries.length }, clientIp(req));
  return ok({ saved: input.entries.length });
});
