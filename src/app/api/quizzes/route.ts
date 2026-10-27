import { z } from "zod";
import { assertTeachesClassTopic } from "@/lib/access";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { classTopic } from "@/lib/schemas";
import { apiUser, body, clientIp, ok, route } from "@/lib/http";

const Create = z.object({
  title: z.string().trim().min(3).max(160),
  classTopic,
  instructions: z.string().trim().max(1000).default(""),
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "quiz.manage");
  const raw = await body(req, Create);
  const input = { ...raw, ...raw.classTopic };
  await assertTeachesClassTopic(user, input.classId, input.topicId);
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    "INSERT INTO quizzes (title, topic_id, class_id, instructions, status, created_by) VALUES ($1,$2,$3,$4,'draft',$5) RETURNING id",
    [input.title, input.topicId, input.classId, input.instructions || "Answer every question. You will see explanations after you submit.", user.id],
  );
  await recordStatus(db, "quiz", row!.id, null, "draft", "Quiz created", { id: user.id, label: user.name });
  await audit(db, user.id, "quiz.create", "quiz", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
