import { z } from "zod";
import { assertTopicAccess } from "@/lib/access";
import { explainMistake, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { approvedPassages } from "@/lib/grounding";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";

const Input = z.object({ questionId: z.coerce.number().int().positive(), chosen: z.number().int().min(0).max(3).nullable() });

/** "Explain my mistake" after a quiz. Students may only ask about questions from quizzes they have submitted. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "learning.use");
  limit(req, `explain:${user.id}`, 30, 600);
  const { questionId, chosen } = await body(req, Input);
  const db = await getDb();
  const q = await db.one<{ id: number; topic_id: number; prompt: string; options: string[]; correct_index: number; explanation: string }>(
    "SELECT id, topic_id, prompt, options, correct_index, explanation FROM questions WHERE id = $1 AND status = 'approved'",
    [questionId],
  );
  if (!q) throw new ApiError(404, "Question not found.");
  const topic = await assertTopicAccess(user, q.topic_id);
  if (user.role === "student") {
    // The explanation reveals the answer, so it is available only after the student has submitted a quiz containing it.
    const attempted = await db.one<{ ok: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM quiz_attempts a JOIN quiz_questions qq ON qq.quiz_id = a.quiz_id
                       WHERE a.student_id = $1 AND qq.question_id = $2) AS ok`,
      [user.studentId ?? 0, q.id],
    );
    if (!attempted?.ok) throw new ApiError(403, "Explanations are available after you submit the quiz.");
  }
  const passages = await approvedPassages(topic.id, q.prompt, 3);
  const out = await withFallback(
    () => explainMistake({
      userKey: String(user.id), level: topic.class_level, topic: topic.name, prompt: q.prompt, options: q.options,
      chosen, correct: q.correct_index, explanation: q.explanation, passages,
    }),
    () => `**Correct answer: ${q.options[q.correct_index]}.** ${q.explanation}${passages[0] ? `\n\n**From your approved material:** ${passages[0].text}` : ""}`,
  );
  await logAi(user, "explain", out.mode, "question", q.id, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});
