import { z } from "zod";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, limit, ok, route } from "@/lib/http";

const Progress = z.object({ slug: z.string().max(80), passed: z.boolean(), code: z.string().max(20000).default("") });

/**
 * Records progress on challenges whose tests run in the student's browser (Python, JavaScript,
 * HTML, robot). The record says so (verified_by = client_tests): it supports learning, it is not
 * an assessment. Student code is never executed on the server.
 */
export const POST = route(async (req) => {
  const user = await apiUser(req, "coding.use");
  limit(req, `coding-progress:${user.id}`, 60, 600);
  const input = await body(req, Progress);
  if (!user.studentId) return ok({ saved: false });
  const db = await getDb();
  const c = await db.one<{ id: number; kind: string }>("SELECT id, kind FROM coding_challenges WHERE slug = $1", [input.slug]);
  if (!c) throw new ApiError(404, "Challenge not found");
  if (c.kind === "mcq") throw new ApiError(400, "This challenge is graded by the server.");
  await db.query(
    `INSERT INTO coding_progress (student_id, challenge_id, status, verified_by, code) VALUES ($1,$2,$3,'client_tests',$4)
     ON CONFLICT (student_id, challenge_id) DO UPDATE SET status = CASE WHEN coding_progress.status = 'passed' THEN 'passed' ELSE EXCLUDED.status END,
       code = EXCLUDED.code, updated_at = now()`,
    [user.studentId, c.id, input.passed ? "passed" : "attempted", input.code],
  );
  await db.query("INSERT INTO learning_events (student_id, kind, detail) VALUES ($1,'coding_progress',$2)", [user.studentId, JSON.stringify({ slug: input.slug, passed: input.passed })]);
  return ok({ saved: true });
});
