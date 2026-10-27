import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { requiredDate } from "@/lib/schemas";

const RollCall = z.object({
  date: requiredDate,
  session: z.enum(["morning", "night"]),
  entries: z.array(z.object({ studentId: z.number().int().positive(), status: z.enum(["present", "absent", "on_leave"]) })).min(1).max(500),
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "hostel.manage");
  const input = await body(req, RollCall);
  if (input.date > todayIST()) throw new ApiError(400, "Roll-call cannot be recorded for a future date.");
  const db = await getDb();
  const ids = input.entries.map((e) => e.studentId);
  const boarders = await db.query("SELECT id FROM students WHERE id = ANY($1::int[]) AND is_boarder AND status = 'active'", [ids]);
  if (boarders.length !== new Set(ids).size) throw new ApiError(400, "Roll-call can include only active boarders.");
  await db.tx(async (q) => {
    for (const e of input.entries) {
      await q.query(
        `INSERT INTO hostel_attendance (student_id, date, session, status, marked_by) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (student_id, date, session) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [e.studentId, input.date, input.session, e.status, user.id],
      );
    }
  });
  const absent = input.entries.filter((e) => e.status === "absent").length;
  await audit(db, user.id, "hostel.rollcall", "hostel", input.date, { session: input.session, count: input.entries.length, absent }, clientIp(req));
  return ok({ saved: input.entries.length, absent });
});
