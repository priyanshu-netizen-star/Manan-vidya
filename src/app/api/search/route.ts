import type { NextRequest } from "next/server";
import { ownStudentScope, studentLevel } from "@/lib/access";
import { getDb } from "@/lib/db";
import { apiUser, limit, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";

/** Command-palette search. Each kind of record is searched only when the user's role may open it. */
export const GET = route(async (req: NextRequest) => {
  const user = await apiUser(req);
  limit(req, `search:${user.id}`, 60, 60);
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return ok({ results: [] });
  const db = await getDb();
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const results: { kind: string; label: string; sub: string; href: string }[] = [];

  if (can(user.role, "students.read") && !ownStudentScope(user)) {
    results.push(...(await db.query<{ label: string; sub: string; href: string }>(
      `SELECT s.name AS label, c.name || ' · ' || s.admission_no AS sub, '/app/students/' || s.id AS href
         FROM students s JOIN classes c ON c.id = s.class_id WHERE s.name ILIKE $1 OR s.admission_no ILIKE $1 ORDER BY s.name LIMIT 6`,
      [like],
    )).map((r) => ({ kind: "Student", ...r })));
  }
  if (can(user.role, "enquiry.manage")) {
    results.push(...(await db.query<{ label: string; sub: string; href: string }>(
      `SELECT e.parent_name || ' (' || e.ref_code || ')' AS label, e.child_name || ' · ' || e.grade_sought AS sub, '/app/enquiries/' || e.id AS href
         FROM enquiries e WHERE e.parent_name ILIKE $1 OR e.child_name ILIKE $1 OR e.ref_code ILIKE $1 ORDER BY e.created_at DESC LIMIT 5`,
      [like],
    )).map((r) => ({ kind: "Enquiry", ...r })));
  }
  if (can(user.role, "tasks.manage")) {
    results.push(...(await db.query<{ label: string; sub: string; href: string }>(
      "SELECT title AS label, module || ' · ' || replace(status, '_', ' ') AS sub, '/app/tasks?view=all' AS href FROM tasks WHERE title ILIKE $1 ORDER BY updated_at DESC LIMIT 4",
      [like],
    )).map((r) => ({ kind: "Task", ...r })));
  }
  if (can(user.role, "learning.use") || can(user.role, "content.manage")) {
    const level = user.role === "student" ? await studentLevel(user) : null;
    results.push(...(await db.query<{ label: string; sub: string; href: string }>(
      `SELECT t.name AS label, s.name || ' · Class ' || t.class_level AS sub, '/app/learn/' || t.id AS href
         FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.name ILIKE $1 AND ($2::int IS NULL OR t.class_level = $2) ORDER BY t.class_level, t.name LIMIT 5`,
      [like, level],
    )).map((r) => ({ kind: "Topic", ...r })));
  }
  if (can(user.role, "coding.use")) {
    results.push(...(await db.query<{ label: string; sub: string; href: string }>(
      "SELECT title AS label, track || ' · ' || level AS sub, '/app/coding/' || slug AS href FROM coding_lessons WHERE title ILIKE $1 ORDER BY position LIMIT 4",
      [like],
    )).map((r) => ({ kind: "Lesson", ...r })));
  }
  return ok({ results });
});
