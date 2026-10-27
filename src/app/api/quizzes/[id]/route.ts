import { z } from "zod";
import { assertTeachesClassTopic } from "@/lib/access";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { idList } from "@/lib/schemas";

const Patch = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    title: z.string().trim().min(3).max(160),
    instructions: z.string().trim().max(1000).default(""),
    questionIds: idList,
  }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("archive") }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "quiz.manage");
  const id = intParam((await ctx.params).id);
  const input = await body(req, Patch);
  const db = await getDb();
  const quiz = await db.one<{ id: number; topic_id: number; class_id: number; status: string }>(
    "SELECT id, topic_id, class_id, status FROM quizzes WHERE id = $1",
    [id],
  );
  if (!quiz) throw new ApiError(404, "Quiz not found");
  await assertTeachesClassTopic(user, quiz.class_id, quiz.topic_id);
  const actor = { id: user.id, label: user.name };

  if (input.action === "edit") {
    if (quiz.status !== "draft") throw new ApiError(409, "Only draft quizzes can be edited. Create a new quiz to change a published one.");
    const ids = [...new Set(input.questionIds)];
    if (ids.length) {
      const valid = await db.query<{ id: number }>(
        "SELECT id FROM questions WHERE id = ANY($1::int[]) AND topic_id = $2 AND status = 'approved'",
        [ids, quiz.topic_id],
      );
      if (valid.length !== ids.length) throw new ApiError(400, "Only approved questions from this quiz's topic can be added.");
    }
    await db.tx(async (q) => {
      await q.query("UPDATE quizzes SET title = $2, instructions = $3 WHERE id = $1", [id, input.title, input.instructions]);
      await q.query("DELETE FROM quiz_questions WHERE quiz_id = $1", [id]);
      for (const [i, qid] of ids.entries()) {
        await q.query("INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ($1,$2,$3)", [id, qid, i]);
      }
    });
  } else if (input.action === "publish") {
    if (quiz.status !== "draft") throw new ApiError(409, "Only draft quizzes can be published.");
    const check = await db.one<{ total: number; approved: number }>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE q.status = 'approved')::int AS approved
         FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id WHERE qq.quiz_id = $1`,
      [id],
    );
    if (!check || check.total === 0) throw new ApiError(400, "Add at least one approved question before publishing.");
    if (check.approved !== check.total) throw new ApiError(400, "Every question must be approved before the quiz is published.");
    await db.query("UPDATE quizzes SET status = 'published', published_by = $2, published_at = now() WHERE id = $1", [id, user.id]);
    await recordStatus(db, "quiz", id, "draft", "published", null, actor);
  } else {
    if (quiz.status === "archived") throw new ApiError(409, "This quiz is already archived.");
    await db.query("UPDATE quizzes SET status = 'archived' WHERE id = $1", [id]);
    await recordStatus(db, "quiz", id, quiz.status, "archived", null, actor);
  }
  await audit(db, user.id, `quiz.${input.action}`, "quiz", id, {}, clientIp(req));
  return ok();
});
