import "server-only";
import { getDb } from "./db";
import { addDays, todayIST } from "./dates";

/** Read models shared by dashboards, teacher views, progress pages and the command centre. */

export type StudentInfo = { id: number; name: string; admission_no: string; class_id: number; class_name: string; level: number; roll_no: number; is_boarder: boolean };

export async function studentInfo(studentId: number) {
  const db = await getDb();
  return db.one<StudentInfo>(
    `SELECT s.id, s.name, s.admission_no, s.class_id, c.name AS class_name, c.level, s.roll_no, s.is_boarder
       FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1`,
    [studentId],
  );
}

export type TopicProgress = {
  topic_id: number; topic: string; subject: string; attempts: number; best_percent: number | null; last_percent: number | null; last_at: string | null;
};

export async function studentTopicProgress(studentId: number, level: number) {
  const db = await getDb();
  return db.query<TopicProgress>(
    `SELECT t.id AS topic_id, t.name AS topic, sub.name AS subject,
            count(a.id)::int AS attempts,
            max(round(100.0 * a.score / NULLIF(a.total, 0)))::int AS best_percent,
            (array_agg(round(100.0 * a.score / NULLIF(a.total, 0))::int ORDER BY a.submitted_at DESC))[1] AS last_percent,
            max(a.submitted_at) AS last_at
       FROM topics t
       JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN quizzes qz ON qz.topic_id = t.id AND qz.status = 'published'
       LEFT JOIN quiz_attempts a ON a.quiz_id = qz.id AND a.student_id = $1
      WHERE t.class_level = $2
      GROUP BY t.id, t.name, sub.name, t.position
      ORDER BY sub.name, t.position`,
    [studentId, level],
  );
}

export async function recentAttempts(studentId: number, limit = 10) {
  const db = await getDb();
  return db.query<{ id: number; quiz_id: number; title: string; topic: string; score: number; total: number; submitted_at: string }>(
    `SELECT a.id, a.quiz_id, qz.title, t.name AS topic, a.score, a.total, a.submitted_at
       FROM quiz_attempts a JOIN quizzes qz ON qz.id = a.quiz_id JOIN topics t ON t.id = qz.topic_id
      WHERE a.student_id = $1 ORDER BY a.submitted_at DESC LIMIT $2`,
    [studentId, limit],
  );
}

export type TopicPerformance = {
  topic_id: number; topic: string; subject: string; class_name: string; class_id: number; attempts: number; students: number; class_size: number; avg_percent: number | null;
};

export async function topicPerformance(opts: { teacherId?: number; classId?: number } = {}) {
  const db = await getDb();
  return db.query<TopicPerformance>(
    `SELECT t.id AS topic_id, t.name AS topic, sub.name AS subject, c.name AS class_name, c.id AS class_id,
            count(a.id)::int AS attempts, count(DISTINCT a.student_id)::int AS students,
            (SELECT count(*)::int FROM students s WHERE s.class_id = c.id AND s.status = 'active') AS class_size,
            round(avg(100.0 * a.score / NULLIF(a.total, 0)))::int AS avg_percent
       FROM quizzes qz
       JOIN topics t ON t.id = qz.topic_id
       JOIN subjects sub ON sub.id = t.subject_id
       JOIN classes c ON c.id = qz.class_id
       LEFT JOIN quiz_attempts a ON a.quiz_id = qz.id
      WHERE qz.status = 'published'
        AND ($1::int IS NULL OR EXISTS (SELECT 1 FROM teaching_assignments ta WHERE ta.teacher_id = $1 AND ta.class_id = c.id AND ta.subject_id = sub.id))
        AND ($2::int IS NULL OR c.id = $2)
      GROUP BY t.id, t.name, sub.name, c.name, c.id
      ORDER BY avg_percent ASC NULLS LAST`,
    [opts.teacherId ?? null, opts.classId ?? null],
  );
}

/** Per-question correctness for a quiz, computed from stored answers. */
export async function questionAnalysis(quizId: number) {
  const db = await getDb();
  return db.query<{ question_id: number; prompt: string; options: string[]; correct_index: number; answered: number; correct: number; common_wrong: number | null }>(
    `WITH ans AS (
       SELECT qq.question_id, (a.answers ->> qq.question_id::text)::int AS chosen
         FROM quiz_attempts a JOIN quiz_questions qq ON qq.quiz_id = a.quiz_id
        WHERE a.quiz_id = $1
     )
     SELECT q.id AS question_id, q.prompt, q.options, q.correct_index,
            count(ans.chosen)::int AS answered,
            count(*) FILTER (WHERE ans.chosen = q.correct_index)::int AS correct,
            (SELECT x.chosen FROM ans x WHERE x.question_id = q.id AND x.chosen IS NOT NULL AND x.chosen <> q.correct_index
              GROUP BY x.chosen ORDER BY count(*) DESC LIMIT 1) AS common_wrong
       FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id
       LEFT JOIN ans ON ans.question_id = q.id
      WHERE qq.quiz_id = $1
      GROUP BY q.id, q.prompt, q.options, q.correct_index, qq.position
      ORDER BY qq.position`,
    [quizId],
  );
}

export async function attendanceTrend(days: number, classId?: number | null) {
  const db = await getDb();
  const from = addDays(todayIST(), -Math.ceil(days * 1.4));
  return db.query<{ date: string; total: number; present: number; percent: number }>(
    `SELECT a.date, count(*)::int AS total,
            count(*) FILTER (WHERE a.status IN ('present','late'))::int AS present,
            round(100.0 * count(*) FILTER (WHERE a.status IN ('present','late')) / count(*))::int AS percent
       FROM attendance a JOIN students s ON s.id = a.student_id
      WHERE a.date >= $1 AND ($2::int IS NULL OR s.class_id = $2)
      GROUP BY a.date ORDER BY a.date DESC LIMIT $3`,
    [from, classId ?? null, days],
  ).then((rows) => rows.reverse());
}

export async function enquiryCounts() {
  const db = await getDb();
  return db.query<{ status: string; n: number }>("SELECT status, count(*)::int AS n FROM enquiries GROUP BY status");
}

export async function enquiryAttention() {
  const db = await getDb();
  return db.one<{ new_count: number; due: number; escalated: number }>(
    `SELECT count(*) FILTER (WHERE status = 'new')::int AS new_count,
            count(*) FILTER (WHERE next_follow_up <= $1 AND status NOT IN ('admitted','closed'))::int AS due,
            count(*) FILTER (WHERE escalated AND status NOT IN ('admitted','closed'))::int AS escalated
       FROM enquiries`,
    [todayIST()],
  );
}

export async function hostelSummary() {
  const db = await getDb();
  return db.one<{ boarders: number; beds: number; occupied: number; pending: number; out_now: number; open_maintenance: number; last_rollcall: string | null }>(
    `SELECT (SELECT count(*)::int FROM students WHERE is_boarder AND status = 'active') AS boarders,
            (SELECT count(*)::int FROM hostel_beds) AS beds,
            (SELECT count(*)::int FROM bed_allocations WHERE to_date IS NULL) AS occupied,
            (SELECT count(*)::int FROM leave_requests WHERE status = 'pending') AS pending,
            (SELECT count(*)::int FROM leave_requests WHERE status = 'checked_out') AS out_now,
            (SELECT count(*)::int FROM maintenance_requests WHERE status IN ('open','in_progress')) AS open_maintenance,
            (SELECT max(date)::text FROM hostel_attendance) AS last_rollcall`,
  );
}

export async function taskCounts(assigneeId?: number) {
  const db = await getDb();
  return db.query<{ status: string; n: number }>(
    "SELECT status, count(*)::int AS n FROM tasks WHERE ($1::int IS NULL OR assignee_id = $1) GROUP BY status",
    [assigneeId ?? null],
  );
}

export async function classesList() {
  const db = await getDb();
  return db.query<{ id: number; name: string; level: number; section: string }>("SELECT id, name, level, section FROM classes ORDER BY level, section");
}

export async function teacherClasses(teacherId: number) {
  const db = await getDb();
  return db.query<{ class_id: number; class_name: string; level: number; subject_id: number; subject: string }>(
    `SELECT c.id AS class_id, c.name AS class_name, c.level, sub.id AS subject_id, sub.name AS subject
       FROM teaching_assignments ta JOIN classes c ON c.id = ta.class_id JOIN subjects sub ON sub.id = ta.subject_id
      WHERE ta.teacher_id = $1 ORDER BY c.level, sub.name`,
    [teacherId],
  );
}

/** Whether the teacher teaches this subject at this class level (used to scope content edits). */
export async function teacherCanEditTopic(teacherId: number, topicId: number) {
  const db = await getDb();
  const r = await db.one<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM topics t JOIN teaching_assignments ta ON ta.subject_id = t.subject_id
         JOIN classes c ON c.id = ta.class_id AND c.level = t.class_level
        WHERE t.id = $2 AND ta.teacher_id = $1) AS ok`,
    [teacherId, topicId],
  );
  return !!r?.ok;
}

export async function topicsWithSubjects(level?: number) {
  const db = await getDb();
  return db.query<{ id: number; name: string; subject: string; subject_id: number; class_level: number }>(
    `SELECT t.id, t.name, s.name AS subject, s.id AS subject_id, t.class_level
       FROM topics t JOIN subjects s ON s.id = t.subject_id
      WHERE ($1::int IS NULL OR t.class_level = $1) ORDER BY t.class_level DESC, s.name, t.position`,
    [level ?? null],
  );
}

export type TeachOption = { class_id: number; class_name: string; topic_id: number; topic: string; subject: string; level: number };

/** (class, topic) pairs this user may build quizzes / worksheets / lesson plans for. */
export async function teachOptions(user: { id: number; role: string }) {
  const db = await getDb();
  return db.query<TeachOption>(
    `SELECT DISTINCT c.id AS class_id, c.name AS class_name, t.id AS topic_id, t.name AS topic, s.name AS subject, c.level
       FROM topics t JOIN subjects s ON s.id = t.subject_id JOIN classes c ON c.level = t.class_level
      WHERE $2 = 'platform_admin'
         OR EXISTS (SELECT 1 FROM teaching_assignments ta WHERE ta.teacher_id = $1 AND ta.class_id = c.id AND ta.subject_id = t.subject_id)
      ORDER BY c.level DESC, s.name, t.name`,
    [user.id, user.role],
  );
}

/** Topics whose content this user may see in the teacher workspace (management sees all for approval). */
export async function manageableTopics(user: { id: number; role: string }) {
  const db = await getDb();
  return db.query<{ id: number; name: string; subject: string; class_level: number }>(
    `SELECT t.id, t.name, s.name AS subject, t.class_level
       FROM topics t JOIN subjects s ON s.id = t.subject_id
      WHERE $2 IN ('platform_admin','management')
         OR EXISTS (SELECT 1 FROM teaching_assignments ta JOIN classes c ON c.id = ta.class_id
                     WHERE ta.teacher_id = $1 AND ta.subject_id = t.subject_id AND c.level = t.class_level)
      ORDER BY t.class_level DESC, s.name, t.position`,
    [user.id, user.role],
  );
}

export const levelName = (level: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][level] ?? String(level);
