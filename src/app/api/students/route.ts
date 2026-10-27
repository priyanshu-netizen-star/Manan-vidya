import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { StudentInput } from "@/lib/schemas";

export const POST = route(async (req) => {
  const user = await apiUser(req, "students.write");
  const s = await body(req, StudentInput);
  const db = await getDb();
  if (await db.one("SELECT 1 FROM students WHERE admission_no = $1", [s.admissionNo])) throw new ApiError(409, "That admission number is already in use.");
  if (s.rollNo && (await db.one("SELECT 1 FROM students WHERE class_id = $1 AND roll_no = $2 AND status = 'active'", [s.classId, s.rollNo]))) {
    throw new ApiError(409, "Another active student in this class has that roll number.");
  }
  const row = await db.one<{ id: number }>(
    `INSERT INTO students (admission_no, name, class_id, roll_no, gender, date_of_birth, guardian_name, guardian_phone, is_boarder)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [s.admissionNo, s.name, s.classId, s.rollNo, s.gender, s.dateOfBirth, s.guardianName, s.guardianPhone, s.isBoarder],
  );
  await audit(db, user.id, "student.create", "student", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
