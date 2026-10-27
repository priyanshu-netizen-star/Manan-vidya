import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";

const Marks = z.object({
  subjectId: z.coerce.number().int().positive(),
  entries: z.array(z.object({ studentId: z.number().int().positive(), marks: z.number().min(0).max(1000).nullable() })).min(1).max(100),
});

/** Saves marks for one subject of one exam. Teachers may enter only subjects they teach in that class. */
export const POST = route(async (req, ctx) => {
  const user = await apiUser(req, "marks.enter");
  const examId = intParam((await ctx.params).id);
  const input = await body(req, Marks);
  const db = await getDb();
  const exam = await db.one<{ class_id: number; max_marks: number; status: string }>("SELECT class_id, max_marks, status FROM exams WHERE id = $1", [examId]);
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.status === "locked") throw new ApiError(409, "This exam is locked. Ask the office to unlock it before changing marks.");
  if (user.role === "teacher") {
    const teaches = await db.one("SELECT 1 FROM teaching_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3", [user.id, exam.class_id, input.subjectId]);
    if (!teaches) throw new ApiError(403, "You can only enter marks for subjects you teach in this class.");
  }
  for (const e of input.entries) {
    if (e.marks != null && e.marks > exam.max_marks) throw new ApiError(400, `Marks cannot be more than the maximum (${exam.max_marks}).`);
    if (e.marks != null && Math.round(e.marks * 2) !== e.marks * 2) throw new ApiError(400, "Marks can have at most one half mark (e.g. 37.5).");
  }
  const ids = input.entries.map((e) => e.studentId);
  const inClass = await db.query("SELECT id FROM students WHERE id = ANY($1::int[]) AND class_id = $2", [ids, exam.class_id]);
  if (inClass.length !== new Set(ids).size) throw new ApiError(400, "Every student must belong to this exam's class.");
  await db.tx(async (q) => {
    for (const e of input.entries) {
      await q.query(
        `INSERT INTO marks (exam_id, student_id, subject_id, marks, entered_by) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (exam_id, student_id, subject_id) DO UPDATE SET marks = EXCLUDED.marks, entered_by = EXCLUDED.entered_by, updated_at = now()`,
        [examId, e.studentId, input.subjectId, e.marks, user.id],
      );
    }
  });
  await audit(db, user.id, "marks.enter", "exam", examId, { subjectId: input.subjectId, count: input.entries.length }, clientIp(req));
  return ok({ saved: input.entries.length });
});
