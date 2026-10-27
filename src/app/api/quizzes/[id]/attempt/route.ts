import { z } from "zod";
import { studentLevel } from "@/lib/access";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, intParam, limit, ok, route } from "@/lib/http";
import { scoreQuiz } from "@/lib/quiz";

const Submit = z.object({ answers: z.record(z.string().regex(/^\d+$/), z.number().int().min(0).max(9).nullable()) });

/** Scores a quiz on the server. Students' attempts are stored; staff previews are scored but not stored. */
export const POST = route(async (req, ctx) => {
  const user = await apiUser(req, "learning.use");
  limit(req, `attempt:${user.id}`, 30, 600);
  const quizId = intParam((await ctx.params).id);
  const { answers } = await body(req, Submit);
  const db = await getDb();
  const quiz = await db.one<{ id: number; topic_id: number; class_level: number; status: string }>(
    "SELECT qz.id, qz.topic_id, c.level AS class_level, qz.status FROM quizzes qz JOIN classes c ON c.id = qz.class_id WHERE qz.id = $1",
    [quizId],
  );
  if (!quiz) throw new ApiError(404, "Quiz not found");
  if (user.role === "student") {
    if (quiz.status !== "published") throw new ApiError(403, "This quiz is not open.");
    if ((await studentLevel(user)) !== quiz.class_level) throw new ApiError(403, "This quiz is not for your class.");
  }
  const questions = await db.query<{ id: number; correct_index: number; options: string[]; explanation: string }>(
    `SELECT q.id, q.correct_index, q.options, q.explanation FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id
      WHERE qq.quiz_id = $1 ORDER BY qq.position`,
    [quizId],
  );
  if (!questions.length) throw new ApiError(400, "This quiz has no questions.");
  let result;
  try {
    result = scoreQuiz(questions, answers);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  const clean = Object.fromEntries(result.results.map((r) => [String(r.questionId), r.chosen]));
  let attemptId: number | null = null;
  if (user.role === "student" && user.studentId) {
    attemptId = await db.tx(async (q) => {
      const [row] = await q.query<{ id: number }>(
        "INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [quizId, user.studentId, JSON.stringify(clean), result.score, result.total],
      );
      await q.query("INSERT INTO learning_events (student_id, topic_id, kind, detail) VALUES ($1,$2,'quiz_attempt',$3)", [
        user.studentId, quiz.topic_id, JSON.stringify({ quizId, score: result.score, total: result.total }),
      ]);
      return row.id;
    });
  }
  const explanations = Object.fromEntries(questions.map((q) => [String(q.id), q.explanation]));
  return ok({ attemptId, saved: attemptId !== null, ...result, explanations });
});
