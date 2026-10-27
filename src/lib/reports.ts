import "server-only";
import { getDb } from "./db";
import { addDays, todayIST } from "./dates";
import { ENQUIRY_LABEL, type EnquiryStatus } from "./workflows";

/** Administrative reports. Each returns a header row and data rows so it can be shown and exported identically. */

export type Report = { title: string; description: string; head: string[]; rows: (string | number | null)[][] };

export const REPORTS = {
  "class-strength": "Class strength and boarders",
  "attendance-30d": "Attendance by student (last 30 days)",
  "low-attendance": "Students below 85% attendance (last 30 days)",
  "exam-results": "Latest locked exam: results by subject",
  "enquiry-pipeline": "Admission enquiry pipeline",
  "quiz-participation": "Quiz participation by class",
} as const;
export type ReportName = keyof typeof REPORTS;

export async function runReport(name: ReportName): Promise<Report> {
  const db = await getDb();
  const from = addDays(todayIST(), -30);
  const title = REPORTS[name];
  switch (name) {
    case "class-strength": {
      const rows = await db.query<{ name: string; total: number; girls: number; boys: number; boarders: number }>(
        `SELECT c.name, count(s.id)::int AS total, count(*) FILTER (WHERE s.gender = 'F')::int AS girls,
                count(*) FILTER (WHERE s.gender = 'M')::int AS boys, count(*) FILTER (WHERE s.is_boarder)::int AS boarders
           FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active' GROUP BY c.id, c.name, c.level ORDER BY c.level`,
      );
      return { title, description: "Active students per class.", head: ["Class", "Students", "Girls", "Boys", "Boarders"], rows: rows.map((r) => [r.name, r.total, r.girls, r.boys, r.boarders]) };
    }
    case "attendance-30d":
    case "low-attendance": {
      const rows = await db.query<{ class_name: string; roll_no: number; name: string; days: number; present: number; pct: number }>(
        `SELECT c.name AS class_name, s.roll_no, s.name, count(a.id)::int AS days,
                count(*) FILTER (WHERE a.status IN ('present','late'))::int AS present,
                round(100.0 * count(*) FILTER (WHERE a.status IN ('present','late')) / NULLIF(count(a.id),0))::int AS pct
           FROM students s JOIN classes c ON c.id = s.class_id JOIN attendance a ON a.student_id = s.id AND a.date >= $1
          WHERE s.status = 'active' GROUP BY c.level, c.name, s.id, s.roll_no, s.name ORDER BY c.level, s.roll_no`,
        [from],
      );
      const list = name === "low-attendance" ? rows.filter((r) => r.pct < 85) : rows;
      return {
        title,
        description: name === "low-attendance" ? "A prompt for a conversation with the family; not an automated judgement." : `School days recorded since ${from}.`,
        head: ["Class", "Roll", "Student", "Days recorded", "Present (incl. late)", "Attendance %"],
        rows: list.map((r) => [r.class_name, r.roll_no, r.name, r.days, r.present, r.pct]),
      };
    }
    case "exam-results": {
      const rows = await db.query<{ exam: string; class_name: string; subject: string; entered: number; avg: number; max: number; top: number; low: number }>(
        `WITH latest AS (SELECT DISTINCT ON (class_id) id, name, class_id, max_marks FROM exams WHERE status = 'locked' ORDER BY class_id, held_on DESC NULLS LAST, id DESC)
         SELECT l.name AS exam, c.name AS class_name, sub.name AS subject, count(m.marks)::int AS entered,
                round(avg(m.marks), 1)::float AS avg, l.max_marks AS max, max(m.marks)::float AS top, min(m.marks)::float AS low
           FROM latest l JOIN classes c ON c.id = l.class_id JOIN marks m ON m.exam_id = l.id JOIN subjects sub ON sub.id = m.subject_id
          GROUP BY l.name, c.level, c.name, sub.name, l.max_marks ORDER BY c.level, sub.name`,
      );
      return {
        title, description: "Most recent locked examination for each class.",
        head: ["Exam", "Class", "Subject", "Marks entered", "Average", "Out of", "Highest", "Lowest"],
        rows: rows.map((r) => [r.exam, r.class_name, r.subject, r.entered, r.avg, r.max, r.top, r.low]),
      };
    }
    case "enquiry-pipeline": {
      const rows = await db.query<{ status: EnquiryStatus; n: number; boarding: number; escalated: number }>(
        `SELECT status, count(*)::int AS n, count(*) FILTER (WHERE boarding_interest = 'boarding')::int AS boarding,
                count(*) FILTER (WHERE escalated)::int AS escalated FROM enquiries GROUP BY status`,
      );
      const order = Object.keys(ENQUIRY_LABEL) as EnquiryStatus[];
      return {
        title, description: "All enquiries by current status.",
        head: ["Status", "Enquiries", "Interested in boarding", "Awaiting staff reply"],
        rows: order.map((s) => { const r = rows.find((x) => x.status === s); return [ENQUIRY_LABEL[s], r?.n ?? 0, r?.boarding ?? 0, r?.escalated ?? 0]; }),
      };
    }
    case "quiz-participation": {
      const rows = await db.query<{ class_name: string; students: number; active: number; attempts: number; avg: number | null }>(
        `SELECT c.name AS class_name, (SELECT count(*)::int FROM students s WHERE s.class_id = c.id AND s.status = 'active') AS students,
                count(DISTINCT a.student_id)::int AS active, count(a.id)::int AS attempts,
                round(avg(100.0 * a.score / NULLIF(a.total,0)))::int AS avg
           FROM classes c LEFT JOIN quizzes qz ON qz.class_id = c.id LEFT JOIN quiz_attempts a ON a.quiz_id = qz.id AND a.submitted_at >= $1
          GROUP BY c.id, c.name, c.level ORDER BY c.level`,
        [from],
      );
      return {
        title, description: "Practice quiz use in the last 30 days.",
        head: ["Class", "Students", "Students who took a quiz", "Attempts", "Average score %"],
        rows: rows.map((r) => [r.class_name, r.students, r.active, r.attempts, r.avg]),
      };
    }
  }
}

/** RFC 4180 CSV with spreadsheet formula-injection protection. */
export function toCsv(report: Report): string {
  const cell = (v: string | number | null) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [report.head, ...report.rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
