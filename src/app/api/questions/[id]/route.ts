import { z } from "zod";
import { assertTopicManage } from "@/lib/access";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";
import { QuestionInput } from "@/lib/schemas";

const Patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("archive") }),
  QuestionInput.omit({ topicId: true }).extend({ action: z.literal("edit") }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req);
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const q = await db.one<{ topic_id: number; status: string }>("SELECT topic_id, status FROM questions WHERE id = $1", [id]);
  if (!q) throw new ApiError(404, "Question not found");

  if (input.action === "approve") {
    if (!can(user.role, "content.approve")) throw new ApiError(403, "You do not have permission to approve questions.");
    await assertTopicManage(user, q.topic_id, "approve");
    if (q.status !== "draft") throw new ApiError(409, "Only draft questions can be approved.");
    await db.query("UPDATE questions SET status = 'approved', reviewed_by = $2, reviewed_at = now() WHERE id = $1", [id, user.id]);
  } else {
    if (!can(user.role, "content.manage")) throw new ApiError(403, "You do not have permission to edit questions.");
    await assertTopicManage(user, q.topic_id);
    if (input.action === "archive") {
      const used = await db.one<{ n: number }>(
        "SELECT count(*)::int AS n FROM quiz_questions qq JOIN quizzes qz ON qz.id = qq.quiz_id WHERE qq.question_id = $1 AND qz.status = 'published'",
        [id],
      );
      if (used!.n > 0) throw new ApiError(409, "This question is used in a published quiz. Archive the quiz first.");
      await db.query("UPDATE questions SET status = 'archived' WHERE id = $1", [id]);
    } else {
      if (new Set(input.options.map((o) => o.toLowerCase())).size !== 4) throw new ApiError(400, "The four options must all be different.");
      const answered = await db.one<{ n: number }>(
        "SELECT count(*)::int AS n FROM quiz_attempts a JOIN quiz_questions qq ON qq.quiz_id = a.quiz_id WHERE qq.question_id = $1",
        [id],
      );
      if (answered!.n > 0) throw new ApiError(409, "Students have already answered this question. Create a new question instead so past results stay accurate.");
      await db.query(
        "UPDATE questions SET prompt = $2, options = $3, correct_index = $4, explanation = $5, difficulty = $6, status = 'draft', reviewed_by = NULL, reviewed_at = NULL WHERE id = $1",
        [id, input.prompt, JSON.stringify(input.options), input.correctIndex, input.explanation, input.difficulty],
      );
    }
  }
  await audit(db, user.id, `question.${input.action}`, "question", id, {}, clientIp(req));
  return ok();
});
