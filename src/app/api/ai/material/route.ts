import { z } from "zod";
import { assertTopicAccess, assertTopicManage } from "@/lib/access";
import { AiUnavailable } from "@/lib/ai";
import { draftMaterial } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { approvedPassages } from "@/lib/grounding";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";

const Input = z.object({ topicId: z.coerce.number().int().positive(), focus: z.string().trim().max(300).default("") });

/** AI-drafted learning material, saved as a draft that a teacher must review and approve. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "ai.teacher_tools");
  limit(req, `ai-material:${user.id}`, 10, 600);
  const input = await body(req, Input);
  await assertTopicManage(user, input.topicId);
  const topic = await assertTopicAccess(user, input.topicId);
  const passages = await approvedPassages(topic.id, `${topic.name} ${topic.summary}`, 6);
  let draft;
  try {
    draft = await draftMaterial({ userKey: String(user.id), subject: topic.subject, topic: topic.name, level: topic.class_level, focus: input.focus, passages });
  } catch (e) {
    if (e instanceof AiUnavailable) throw new ApiError(503, e.message);
    throw e;
  }
  if (!draft.body.trim()) throw new ApiError(503, "The AI service returned an empty draft.");
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    "INSERT INTO materials (topic_id, title, body, status, source, created_by) VALUES ($1,$2,$3,'draft','ai_draft',$4) RETURNING id",
    [topic.id, draft.title.trim().slice(0, 200) || `${topic.name}: draft`, draft.body.trim(), user.id],
  );
  await logAi(user, "material_draft", "ai", "material", row!.id, clientIp(req));
  return ok({ id: row!.id }, 201);
});
