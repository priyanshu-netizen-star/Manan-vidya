import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { ApiError, apiUser, clientIp, intParam, ok, route } from "@/lib/http";

/** Ends an allocation (student leaves the hostel or vacates the bed). History is kept. */
export const DELETE = route(async (req, ctx) => {
  const user = await apiUser(req, "hostel.manage");
  const id = intParam((await ctx.params).id);
  const db = await getDb();
  const a = await db.one<{ student_id: number }>("SELECT student_id FROM bed_allocations WHERE id = $1 AND to_date IS NULL", [id]);
  if (!a) throw new ApiError(404, "Active allocation not found");
  await db.query("UPDATE bed_allocations SET to_date = $2 WHERE id = $1", [id, todayIST()]);
  await audit(db, user.id, "hostel.vacate", "student", a.student_id, { allocationId: id }, clientIp(req));
  return ok();
});
