import "server-only";
import type { SessionUser } from "./auth";
import { getDb } from "./db";
import { addDays, fmtDate, todayIST } from "./dates";
import { masteryBand } from "./quiz";
import {
  attendanceTrend, enquiryAttention, hostelSummary, recentAttempts, studentInfo, studentTopicProgress, taskCounts, topicPerformance,
} from "./queries";

/**
 * Role-scoped facts: short, human-readable statements built only from data the signed-in user is
 * already allowed to see. They feed the dashboard briefing (shown as-is when AI is off) and are the
 * only data the AI Copilot and AI briefing may use, so the AI can never reach beyond the user's role.
 */

export type Fact = { text: string; tone: "attention" | "info" | "good"; href?: string };

export async function roleFacts(user: SessionUser): Promise<Fact[]> {
  const db = await getDb();
  const today = todayIST();
  const facts: Fact[] = [];

  if ((user.role === "student" || user.role === "parent") && user.studentId) {
    const s = await studentInfo(user.studentId);
    if (!s) return facts;
    const who = user.role === "parent" ? s.name.split(" ")[0] : "You";
    const progress = await studentTopicProgress(s.id, s.level);
    const open = await db.query<{ title: string }>(
      `SELECT qz.title FROM quizzes qz WHERE qz.status = 'published' AND qz.class_id = $1
          AND NOT EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = $2) ORDER BY qz.published_at DESC`,
      [s.class_id, s.id],
    );
    facts.push({ text: `${who === "You" ? "You are" : `${s.name} is`} in ${s.class_name}.`, tone: "info" });
    if (open.length) facts.push({ text: `${open.length} published quiz${open.length > 1 ? "zes" : ""} not yet attempted: ${open.slice(0, 3).map((q) => q.title).join("; ")}.`, tone: "attention", href: "/app/learn" });
    else facts.push({ text: "Every published quiz has been attempted.", tone: "good" });
    const weak = progress.filter((p) => p.best_percent != null && masteryBand(p.best_percent) !== "secure").sort((a, b) => (a.best_percent ?? 0) - (b.best_percent ?? 0));
    if (weak.length) facts.push({ text: `Topics to revise (best quiz score below 80%): ${weak.slice(0, 4).map((p) => `${p.topic} (${p.subject}, ${p.best_percent}%)`).join("; ")}.`, tone: "attention", href: "/app/progress" });
    const secure = progress.filter((p) => masteryBand(p.best_percent) === "secure");
    if (secure.length) facts.push({ text: `Secure topics (80% or more): ${secure.slice(0, 4).map((p) => p.topic).join(", ")}${secure.length > 4 ? ` and ${secure.length - 4} more` : ""}.`, tone: "good" });
    const notStarted = progress.filter((p) => p.attempts === 0).length;
    if (notStarted) facts.push({ text: `${notStarted} topic${notStarted > 1 ? "s have" : " has"} no quiz attempts yet.`, tone: "info" });
    const last = (await recentAttempts(s.id, 1))[0];
    if (last) facts.push({ text: `Most recent quiz: ${last.title} on ${fmtDate(last.submitted_at)}, scored ${last.score}/${last.total}.`, tone: "info" });
    const att = await db.one<{ days: number; present: number }>(
      "SELECT count(*)::int AS days, count(*) FILTER (WHERE status IN ('present','late'))::int AS present FROM attendance WHERE student_id = $1 AND date >= $2",
      [s.id, addDays(today, -30)],
    );
    if (att?.days) facts.push({ text: `Attendance in the last 30 days: ${att.present}/${att.days} days (${Math.round((100 * att.present) / att.days)}%).`, tone: att.present / att.days < 0.85 ? "attention" : "good" });
    if (s.is_boarder) {
      const leave = await db.one<{ status: string; kind: string; depart_at: string }>(
        "SELECT status, kind, depart_at FROM leave_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
        [s.id],
      );
      if (leave) facts.push({ text: `Latest hostel ${leave.kind} request (from ${fmtDate(leave.depart_at)}) is ${leave.status.replace(/_/g, " ")}.`, tone: leave.status === "pending" ? "attention" : "info", href: "/app/hostel/leave" });
    }
    const coding = await db.one<{ passed: number }>("SELECT count(*)::int AS passed FROM coding_progress WHERE student_id = $1 AND status = 'passed'", [s.id]);
    if (coding?.passed) facts.push({ text: `${coding.passed} coding, AI or robotics challenge${coding.passed > 1 ? "s" : ""} completed.`, tone: "good", href: "/app/coding" });
    return facts;
  }

  if (user.role === "teacher") {
    const counts = await db.one<{ drafts: number; questions: number; ai: number; quizzes: number }>(
      `SELECT (SELECT count(*)::int FROM materials m WHERE m.status = 'draft' AND m.created_by = $1) AS drafts,
              (SELECT count(*)::int FROM questions q WHERE q.status = 'draft' AND q.created_by = $1) AS questions,
              (SELECT count(*)::int FROM questions q WHERE q.status = 'draft' AND q.source = 'ai_draft' AND q.created_by = $1) AS ai,
              (SELECT count(*)::int FROM quizzes WHERE status = 'draft' AND created_by = $1) AS quizzes`,
      [user.id],
    );
    if (counts?.questions) facts.push({ text: `${counts.questions} question${counts.questions > 1 ? "s" : ""} awaiting your review${counts.ai ? ` (${counts.ai} drafted by AI)` : ""}.`, tone: "attention", href: "/app/teacher/questions" });
    if (counts?.drafts) facts.push({ text: `${counts.drafts} piece${counts.drafts > 1 ? "s" : ""} of learning material still in draft.`, tone: "attention", href: "/app/teacher/content" });
    if (counts?.quizzes) facts.push({ text: `${counts.quizzes} quiz${counts.quizzes > 1 ? "zes" : ""} not yet published.`, tone: "info", href: "/app/teacher/quizzes" });
    const perf = (await topicPerformance({ teacherId: user.id })).filter((t) => t.avg_percent != null);
    const low = perf.filter((t) => (t.avg_percent ?? 100) < 70).slice(0, 3);
    if (low.length) facts.push({ text: `Lowest class averages: ${low.map((t) => `${t.topic} in ${t.class_name} (${t.avg_percent}%)`).join("; ")}. Consider re-teaching.`, tone: "attention", href: "/app/teacher/performance" });
    const lowPart = perf.filter((t) => t.class_size && t.students / t.class_size < 0.5).slice(0, 2);
    if (lowPart.length) facts.push({ text: `Low quiz participation: ${lowPart.map((t) => `${t.topic} in ${t.class_name} (${t.students}/${t.class_size} students)`).join("; ")}.`, tone: "info" });
    const marked = await db.query<{ name: string }>(
      `SELECT DISTINCT c.name FROM teaching_assignments ta JOIN classes c ON c.id = ta.class_id
        WHERE ta.teacher_id = $1 AND NOT EXISTS (SELECT 1 FROM attendance a JOIN students s ON s.id = a.student_id WHERE s.class_id = c.id AND a.date = $2)`,
      [user.id, today],
    );
    if (marked.length) facts.push({ text: `Attendance not yet recorded today for: ${marked.map((m) => m.name).join(", ")}.`, tone: "attention", href: "/app/attendance" });
    const openExams = await db.query<{ name: string; class_name: string }>(
      `SELECT DISTINCT e.name, c.name AS class_name FROM exams e JOIN classes c ON c.id = e.class_id JOIN teaching_assignments ta ON ta.class_id = c.id AND ta.teacher_id = $1
        WHERE e.status = 'open' LIMIT 3`,
      [user.id],
    );
    if (openExams.length) facts.push({ text: `Open for marks entry: ${openExams.map((e) => `${e.name} (${e.class_name})`).join("; ")}.`, tone: "info", href: "/app/exams" });
    if (!facts.length) facts.push({ text: "Nothing is waiting for your review.", tone: "good" });
    return facts;
  }

  if (user.role === "warden") {
    return hostelFacts();
  }

  // Office, management and platform administrators.
  const e = await enquiryAttention();
  if (e?.new_count) facts.push({ text: `${e.new_count} new admission enquir${e.new_count > 1 ? "ies" : "y"} not yet contacted.`, tone: "attention", href: "/app/enquiries" });
  if (e?.due) facts.push({ text: `${e.due} enquiry follow-up${e.due > 1 ? "s are" : " is"} due today or overdue.`, tone: "attention", href: "/app/enquiries" });
  if (e?.escalated) facts.push({ text: `${e.escalated} enquir${e.escalated > 1 ? "ies need" : "y needs"} a personal reply (escalated by the assistant).`, tone: "attention", href: "/app/enquiries" });
  const tasks = await taskCounts(user.role === "office_admin" ? user.id : undefined);
  const open = tasks.filter((t) => t.status !== "done").reduce((n, t) => n + t.n, 0);
  const blocked = tasks.find((t) => t.status === "blocked")?.n ?? 0;
  const overdue = await db.query<{ title: string; due_date: string }>(
    "SELECT title, due_date FROM tasks WHERE status <> 'done' AND due_date < $1 AND ($2::int IS NULL OR assignee_id = $2) ORDER BY due_date LIMIT 3",
    [today, user.role === "office_admin" ? user.id : null],
  );
  facts.push({ text: `${open} open administrative task${open === 1 ? "" : "s"}${blocked ? `, ${blocked} blocked` : ""}.`, tone: blocked ? "attention" : "info", href: "/app/tasks" });
  if (overdue.length) facts.push({ text: `Overdue tasks: ${overdue.map((t) => `${t.title} (due ${fmtDate(t.due_date)})`).join("; ")}.`, tone: "attention", href: "/app/tasks" });
  const trend = await attendanceTrend(14);
  const latest = trend.at(-1);
  if (latest) {
    const avg = Math.round(trend.reduce((n, t) => n + t.percent, 0) / trend.length);
    facts.push({ text: `Attendance on ${fmtDate(latest.date)}: ${latest.percent}% (14-day average ${avg}%).`, tone: latest.percent < avg - 3 ? "attention" : "info" });
  }
  const low = await db.one<{ n: number }>(
    `SELECT count(*)::int AS n FROM (SELECT s.id FROM students s JOIN attendance a ON a.student_id = s.id AND a.date >= $1
       WHERE s.status = 'active' GROUP BY s.id HAVING 100.0 * count(*) FILTER (WHERE a.status IN ('present','late')) / count(*) < 85) x`,
    [addDays(today, -30)],
  );
  if (low?.n) facts.push({ text: `${low.n} student${low.n > 1 ? "s are" : " is"} below 85% attendance over 30 days (a prompt for a conversation with the family).`, tone: "attention", href: "/app/reports?r=low-attendance" });
  if (user.role !== "office_admin") {
    const perf = (await topicPerformance()).filter((t) => t.avg_percent != null);
    if (perf.length) {
      const avg = Math.round(perf.reduce((n, t) => n + (t.avg_percent ?? 0), 0) / perf.length);
      facts.push({ text: `Average practice-quiz score across ${perf.length} topics: ${avg}%. Lowest: ${perf.slice(0, 2).map((t) => `${t.topic} in ${t.class_name} (${t.avg_percent}%)`).join("; ")}.`, tone: "info", href: "/app/teacher/performance" });
    }
    facts.push(...(await hostelFacts()).slice(0, 2));
  }
  return facts;
}

export async function hostelFacts(): Promise<Fact[]> {
  const db = await getDb();
  const h = await hostelSummary();
  const facts: Fact[] = [];
  if (!h) return facts;
  if (h.pending) facts.push({ text: `${h.pending} hostel leave/outpass request${h.pending > 1 ? "s" : ""} awaiting a decision.`, tone: "attention", href: "/app/hostel/leave" });
  facts.push({ text: `${h.out_now} boarder${h.out_now === 1 ? "" : "s"} currently out on leave; ${h.occupied}/${h.beds} beds occupied.`, tone: "info", href: "/app/hostel" });
  const late = await db.query<{ name: string; return_at: string }>(
    `SELECT s.name, l.return_at FROM leave_requests l JOIN students s ON s.id = l.student_id
      WHERE l.status = 'checked_out' AND l.return_at < now() ORDER BY l.return_at LIMIT 3`,
  );
  if (late.length) facts.push({ text: `Past their return time: ${late.map((l) => l.name).join(", ")}. Contact the families.`, tone: "attention", href: "/app/hostel/leave" });
  const urgent = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM maintenance_requests WHERE status IN ('open','in_progress') AND priority = 'urgent'");
  if (h.open_maintenance) facts.push({ text: `${h.open_maintenance} maintenance request${h.open_maintenance > 1 ? "s" : ""} open${urgent?.n ? `, ${urgent.n} urgent` : ""}.`, tone: urgent?.n ? "attention" : "info", href: "/app/hostel/maintenance" });
  if (h.last_rollcall !== todayIST()) facts.push({ text: `Roll-call not yet recorded today${h.last_rollcall ? ` (last on ${fmtDate(h.last_rollcall)})` : ""}.`, tone: "attention", href: "/app/hostel/rollcall" });
  return facts;
}

export function factsAsText(facts: Fact[]) {
  return facts.map((f) => `- ${f.text}`).join("\n");
}
