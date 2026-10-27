import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { StudentInput } from "@/lib/schemas";

const Patch = StudentInput.extend({ status: z.enum(["active", "inactive", "alumni"]) });

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "students.write");
  const id = intParam((await ctx.params).id);
  const s = await body(req, Patch);
  const db = await getDb();
  const before = await db.one<Record<string, unknown>>("SELECT * FROM students WHERE id = $1", [id]);
  if (!before) throw new ApiError(404, "Student not found");
  if (await db.one("SELECT 1 FROM students WHERE admission_no = $1 AND id <> $2", [s.admissionNo, id])) throw new ApiError(409, "That admission number is already in use.");
  if (s.rollNo && s.status === "active" && (await db.one("SELECT 1 FROM students WHERE class_id = $1 AND roll_no = $2 AND status = 'active' AND id <> $3", [s.classId, s.rollNo, id]))) {
    throw new ApiError(409, "Another active student in this class has that roll number.");
  }
  await db.query(
    `UPDATE students SET admission_no = $2, name = $3, class_id = $4, roll_no = $5, gender = $6, date_of_birth = $7,
            guardian_name = $8, guardian_phone = $9, is_boarder = $10, status = $11 WHERE id = $1`,
    [id, s.admissionNo, s.name, s.classId, s.rollNo, s.gender, s.dateOfBirth, s.guardianName, s.guardianPhone, s.isBoarder, s.status],
  );
  // Record which fields changed (names only, not values) so the audit log does not copy personal data.
  const changed = Object.entries({
    admission_no: s.admissionNo, name: s.name, class_id: s.classId, roll_no: s.rollNo, gender: s.gender, date_of_birth: s.dateOfBirth,
    guardian_name: s.guardianName, guardian_phone: s.guardianPhone, is_boarder: s.isBoarder, status: s.status,
  })
    .filter(([k, v]) => String(before[k] ?? "") !== String(v ?? ""))
    .map(([k]) => k);
  await audit(db, user.id, "student.update", "student", id, { changed }, clientIp(req));
  return ok();
});
