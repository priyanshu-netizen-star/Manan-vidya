import { z } from "zod";
import { assertTeachesClassTopic } from "@/lib/access";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { classTopic, idList } from "@/lib/schemas";

const Create = z.object({
  title: z.string().trim().min(3).max(160),
  classTopic,
  instructions: z.string().trim().max(1000).default(""),
  questionIds: idList,
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "content.manage");
  const raw = await body(req, Create);
  const input = { ...raw, ...raw.classTopic };
  await assertTeachesClassTopic(user, input.classId, input.topicId);
  const ids = [...new Set(input.questionIds)];
  if (!ids.length) throw new ApiError(400, "Choose at least one question.");
  const db = await getDb();
  const valid = await db.query("SELECT id FROM questions WHERE id = ANY($1::int[]) AND topic_id = $2 AND status = 'approved'", [ids, input.topicId]);
  if (valid.length !== ids.length) throw new ApiError(400, "Only approved questions from this topic can be used.");
  const row = await db.one<{ id: number }>(
    "INSERT INTO worksheets (title, topic_id, class_id, instructions, question_ids, status, created_by) VALUES ($1,$2,$3,$4,$5,'draft',$6) RETURNING id",
    [input.title, input.topicId, input.classId, input.instructions, JSON.stringify(ids), user.id],
  );
  await audit(db, user.id, "worksheet.create", "worksheet", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
