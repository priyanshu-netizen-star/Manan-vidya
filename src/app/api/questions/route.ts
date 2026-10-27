import { assertTopicManage } from "@/lib/access";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { QuestionInput } from "@/lib/schemas";

/** New questions start as drafts and need approval before they can be used in a quiz. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "content.manage");
  const q = await body(req, QuestionInput);
  if (new Set(q.options.map((o) => o.toLowerCase())).size !== 4) throw new ApiError(400, "The four options must all be different.");
  await assertTopicManage(user, q.topicId);
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    `INSERT INTO questions (topic_id, prompt, options, correct_index, explanation, difficulty, status, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'draft','teacher',$7) RETURNING id`,
    [q.topicId, q.prompt, JSON.stringify(q.options), q.correctIndex, q.explanation, q.difficulty, user.id],
  );
  await audit(db, user.id, "question.create", "question", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
