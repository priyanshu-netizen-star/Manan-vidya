import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ownStudentScope } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { SCHOOL, isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { addDays, fmtDate } from "@/lib/dates";
import { gradeFor } from "@/lib/grades";
import { can } from "@/lib/rbac";
import { RemarkEditor } from "./RemarkEditor";

export const metadata = { title: "Report card" };

export default async function ReportCard({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ exam?: string }> }) {
  const user = await requirePageUser("reportcards.view");
  const studentId = Number((await params).studentId);
  const examId = Number((await searchParams).exam);
  const scope = ownStudentScope(user);
  if (scope && !scope.includes(studentId)) notFound();
  const db = await getDb();
  const s = await db.one<{ id: number; name: string; admission_no: string; roll_no: number | null; class_id: number; class_name: string; guardian_name: string | null; date_of_birth: string | null; seeded: boolean }>(
    "SELECT s.id, s.name, s.admission_no, s.roll_no, s.class_id, c.name AS class_name, s.guardian_name, s.date_of_birth, s.seeded FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1",
    [Number.isInteger(studentId) ? studentId : 0],
  );
  if (!s) notFound();
  const exam = await db.one<{ id: number; name: string; held_on: string | null; max_marks: number; status: string }>(
    "SELECT id, name, held_on, max_marks, status FROM exams WHERE id = $1 AND class_id = $2",
    [Number.isInteger(examId) ? examId : 0, s.class_id],
  );
  if (!exam) notFound();
  if (scope && exam.status !== "locked") notFound(); // families see only finalised results
  const marks = await db.query<{ subject: string; marks: number | null }>(
    `SELECT sub.name AS subject, m.marks FROM subjects sub
       JOIN marks m ON m.subject_id = sub.id AND m.exam_id = $1 AND m.student_id = $2 ORDER BY sub.name`,
    [exam.id, s.id],
  );
  const scored = marks.filter((m) => m.marks != null) as { subject: string; marks: number }[];
  const total = scored.reduce((n, m) => n + m.marks, 0);
  const max = scored.length * exam.max_marks;
  const pct = max ? Math.round((1000 * total) / max) / 10 : null;
  const attFrom = exam.held_on ? addDays(exam.held_on, -60) : addDays(new Date().toISOString().slice(0, 10), -60);
  const att = await db.one<{ days: number; present: number }>(
    "SELECT count(*)::int AS days, count(*) FILTER (WHERE status IN ('present','late'))::int AS present FROM attendance WHERE student_id = $1 AND date >= $2 AND ($3::date IS NULL OR date <= $3)",
    [s.id, attFrom, exam.held_on],
  );

  const remark = await db.one<{ remark: string; status: "draft" | "approved" }>(
    "SELECT remark, status FROM report_remarks WHERE exam_id = $1 AND student_id = $2",
    [exam.id, s.id],
  );
  const staffCanWrite = (can(user.role, "exams.manage") || can(user.role, "marks.enter")) && (user.role !== "teacher" || !!(await db.one<{ ok: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM teaching_assignments WHERE teacher_id = $1 AND class_id = $2) AS ok",
    [user.id, s.class_id],
  ))?.ok);
  const shownRemark = remark && (remark.status === "approved" || !scope) ? remark : null;

  return (
    <div className="max-w-3xl mx-auto card p-6 sm:p-10 print-area">
      <div className="flex justify-between items-start gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="text-lg font-bold font-display">{SCHOOL.name}</p>
          <p className="text-xs text-muted">{SCHOOL.city} · CBSE</p>
          <p className="mt-2 font-semibold">Report card: {exam.name}</p>
        </div>
        <PrintButton />
      </div>
      {(exam.status !== "locked" || s.seeded || isPresentation()) && (
        <p className="mt-3 text-xs font-semibold text-bad">
          {exam.status !== "locked" ? "PROVISIONAL: marks entry is still open. " : ""}
          {s.seeded ? "SAMPLE: synthetic record created for the presentation. Not an official document." : ""}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-5">
        {[
          ["Student", s.name], ["Admission no.", s.admission_no], ["Class", s.class_name], ["Roll no.", s.roll_no ?? "—"],
          ["Parent / guardian", s.guardian_name || "—"], ["Date of birth", fmtDate(s.date_of_birth)], ["Exam date", fmtDate(exam.held_on)],
          ["Attendance (term to exam)", att && att.days ? `${att.present} / ${att.days} days (${Math.round((100 * att.present) / att.days)}%)` : "—"],
        ].map(([k, v]) => (
          <div key={String(k)}><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
      </dl>
      <div className="table-wrap"><table className="table mt-6 border border-line">
        <thead><tr><th>Subject</th><th className="text-right">Marks</th><th className="text-right">Out of</th><th className="text-right">Grade</th></tr></thead>
        <tbody>
          {marks.map((m) => (
            <tr key={m.subject}>
              <td>{m.subject}</td>
              <td className="text-right tabular-nums">{m.marks ?? "Absent / not entered"}</td>
              <td className="text-right tabular-nums">{exam.max_marks}</td>
              <td className="text-right font-semibold">{m.marks == null ? "—" : gradeFor((100 * m.marks) / exam.max_marks)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td>Total</td><td className="text-right tabular-nums">{total}</td><td className="text-right tabular-nums">{max}</td>
            <td className="text-right">{pct == null ? "—" : `${pct}% · ${gradeFor(pct)}`}</td>
          </tr>
        </tbody>
      </table></div>
      <p className="mt-3 text-[0.7rem] text-muted">
        Grade scale (default, to be confirmed by the school): A1 91–100, A2 81–90, B1 71–80, B2 61–70, C1 51–60, C2 41–50, D 33–40, E below 33.
      </p>
      {shownRemark && (
        <div className="mt-6 border border-line rounded-lg p-4">
          <p className="text-xs text-muted">Class teacher&apos;s remark{shownRemark.status === "draft" ? " (draft: not visible to the family)" : ""}</p>
          <p className="mt-1 text-sm">{shownRemark.remark}</p>
        </div>
      )}
      {staffCanWrite && <RemarkEditor studentId={s.id} examId={exam.id} initial={remark?.remark ?? ""} status={remark?.status ?? null} />}
      <div className="grid grid-cols-3 gap-6 mt-14 text-xs text-center">
        <div className="border-t border-ink pt-1">Class teacher</div>
        <div className="border-t border-ink pt-1">Principal</div>
        <div className="border-t border-ink pt-1">Parent / guardian</div>
      </div>
    </div>
  );
}
