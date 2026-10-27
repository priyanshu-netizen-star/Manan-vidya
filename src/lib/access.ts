import "server-only";
import { getDb } from "./db";
import { ApiError } from "./http";
import type { SessionUser } from "./auth";

/**
 * Data-scope checks shared by pages and APIs. Students may only reach topics and quizzes of
 * their own class level; parents only their own child's records.
 */

export async function studentLevel(user: SessionUser): Promise<number | null> {
  if (!user.studentId) return null;
  const db = await getDb();
  const r = await db.one<{ level: number }>("SELECT c.level FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1", [user.studentId]);
  return r?.level ?? null;
}

export async function assertTopicAccess(user: SessionUser, topicId: number) {
  const db = await getDb();
  const topic = await db.one<{ id: number; name: string; class_level: number; subject: string; summary: string }>(
    "SELECT t.id, t.name, t.class_level, s.name AS subject, t.summary FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = $1",
    [topicId],
  );
  if (!topic) throw new ApiError(404, "Topic not found");
  if (user.role === "student") {
    const level = await studentLevel(user);
    if (level !== topic.class_level) throw new ApiError(403, "This topic is not part of your class.");
  }
  return topic;
}

/** Student IDs the user may see personal records for (null = all students, for staff with students.read). */
export function ownStudentScope(user: SessionUser): number[] | null {
  if (user.role === "student" || user.role === "parent") return user.studentId ? [user.studentId] : [];
  return null;
}

/**
 * Content scope: teachers may manage content only for subjects and class levels they teach.
 * Management may approve anything; the platform administrator may do everything.
 */
export async function assertTopicManage(user: SessionUser, topicId: number, mode: "edit" | "approve" = "edit") {
  if (user.role === "platform_admin") return;
  if (mode === "approve" && user.role === "management") return;
  if (user.role === "teacher") {
    const { teacherCanEditTopic } = await import("./queries");
    if (await teacherCanEditTopic(user.id, topicId)) return;
  }
  throw new ApiError(403, "You can only manage content for subjects and classes you teach.");
}

/** Quizzes and worksheets: the teacher must teach the topic's subject to that class. */
export async function assertTeachesClassTopic(user: SessionUser, classId: number, topicId: number) {
  const db = await getDb();
  const t = await db.one<{ subject_id: number; class_level: number; level: number | null }>(
    "SELECT t.subject_id, t.class_level, (SELECT level FROM classes WHERE id = $2) AS level FROM topics t WHERE t.id = $1",
    [topicId, classId],
  );
  if (!t || t.level == null) throw new ApiError(404, "Topic or class not found");
  if (t.level !== t.class_level) throw new ApiError(400, "This topic belongs to a different class level.");
  if (user.role === "platform_admin") return;
  if (user.role === "teacher") {
    const ok = await db.one("SELECT 1 FROM teaching_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3", [user.id, classId, t.subject_id]);
    if (ok) return;
  }
  throw new ApiError(403, "You can only manage quizzes and worksheets for classes and subjects you teach.");
}
