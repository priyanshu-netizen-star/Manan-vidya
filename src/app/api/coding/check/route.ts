import { z } from "zod";
import { gradeMcq, type McqSpec } from "@/lib/coding";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, limit, ok, route } from "@/lib/http";

const Check = z.object({ slug: z.string().max(80), answers: z.array(z.number().int().min(0).max(9).nullable()).max(20) });

/** Server-graded checks (AI-literacy quizzes). Answers never reach the browser before grading. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "coding.use");
  limit(req, `coding-check:${user.id}`, 30, 600);
  const { slug, answers } = await body(req, Check);
  const db = await getDb();
  const c = await db.one<{ id: number; kind: string; spec: McqSpec }>("SELECT id, kind, spec FROM coding_challenges WHERE slug = $1", [slug]);
  if (!c || c.kind !== "mcq") throw new ApiError(404, "Challenge not found");
  const result = gradeMcq(c.spec, answers);
  if (user.studentId) {
    await db.query(
      `INSERT INTO coding_progress (student_id, challenge_id, status, verified_by) VALUES ($1,$2,$3,'server')
       ON CONFLICT (student_id, challenge_id) DO UPDATE SET status = CASE WHEN coding_progress.status = 'passed' THEN 'passed' ELSE EXCLUDED.status END,
         verified_by = 'server', updated_at = now()`,
      [user.studentId, c.id, result.passed ? "passed" : "attempted"],
    );
  }
  return ok(result);
});
