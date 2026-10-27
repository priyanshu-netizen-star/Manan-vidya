import "server-only";
import type { SessionUser } from "./auth";
import { getDb } from "./db";
import { gradeFor } from "./grades";
import { ApiError } from "./http";
import { can } from "./rbac";

/** Staff who may write report-card remarks: exam managers, or a teacher who teaches the student's class. */
export async function assertRemarkAccess(user: SessionUser, studentId: number, examId: number) {
  if (!can(user.role, "marks.enter") && !can(user.role, "exams.manage")) throw new ApiError(403, "You do not have permission to do this.");
  const db = await getDb();
  const row = await db.one<{ class_id: number; name: string; level: number; exam_name: string; max_marks: number; held_on: string | null }>(
    `SELECT s.class_id, s.name, c.level, e.name AS exam_name, e.max_marks, e.held_on FROM students s
       JOIN classes c ON c.id = s.class_id JOIN exams e ON e.id = $2 AND e.class_id = s.class_id WHERE s.id = $1`,
    [studentId, examId],
  );
  if (!row) throw new ApiError(404, "Student or exam not found.");
  if (user.role === "teacher") {
    const teaches = await db.one<{ ok: boolean }>("SELECT EXISTS (SELECT 1 FROM teaching_assignments WHERE teacher_id = $1 AND class_id = $2) AS ok", [user.id, row.class_id]);
    if (!teaches?.ok) throw new ApiError(403, "You can write remarks only for classes you teach.");
  }
  return row;
}

/** Marks and attendance summary used to draft a remark. */
export async function remarkData(studentId: number, examId: number, maxMarks: number) {
  const db = await getDb();
  const marks = await db.query<{ subject: string; marks: number | null }>(
    "SELECT sub.name AS subject, m.marks FROM marks m JOIN subjects sub ON sub.id = m.subject_id WHERE m.exam_id = $1 AND m.student_id = $2 ORDER BY sub.name",
    [examId, studentId],
  );
  const subjects = marks.filter((m) => m.marks != null).map((m) => ({ subject: m.subject, pct: Math.round((100 * (m.marks as number)) / maxMarks) }));
  const att = await db.one<{ days: number; present: number }>(
    "SELECT count(*)::int AS days, count(*) FILTER (WHERE status IN ('present','late'))::int AS present FROM attendance WHERE student_id = $1 AND date >= (CURRENT_DATE - 60)",
    [studentId],
  );
  const summary = [
    `Marks: ${subjects.map((s) => `${s.subject} ${s.pct}% (${gradeFor(s.pct)})`).join(", ") || "not entered"}`,
    att?.days ? `Attendance over the last 60 days: ${Math.round((100 * att.present) / att.days)}%` : "",
  ].filter(Boolean).join("\n");
  return { subjects, summary };
}
