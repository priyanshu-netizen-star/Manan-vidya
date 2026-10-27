import { z } from "zod";
import { assertTopicAccess, assertTopicManage } from "@/lib/access";
import { AiUnavailable, draftQuestions } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { rankPassages } from "@/lib/text";

const Draft = z.object({
  topicId: z.coerce.number().int().positive(),
  count: z.coerce.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
});

/** AI-drafted questions are stored as drafts (source = ai_draft). A teacher must approve each one. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "ai.teacher_tools");
  limit(req, `ai-draft:${user.id}`, 10, 600);
  const input = await body(req, Draft);
  await assertTopicManage(user, input.topicId);
  const topic = await assertTopicAccess(user, input.topicId);
  const db = await getDb();
  const materials = await db.query<{ id: number; title: string; body: string }>(
    "SELECT id, title, body FROM materials WHERE topic_id = $1 AND status = 'approved'",
    [input.topicId],
  );
  if (!materials.length) {
    throw new ApiError(400, "Approve at least one piece of learning material for this topic first. AI questions are drafted only from approved material.");
  }
  const ranked = rankPassages(`${topic.name} ${topic.summary}`, materials, 8);
  const passages = ranked.length ? ranked : materials.map((m) => ({ materialId: m.id, title: m.title, text: m.body, score: 0 }));
  let drafts;
  try {
    drafts = await draftQuestions({
      userKey: String(user.id), subject: topic.subject, topic: topic.name, classLevel: topic.class_level,
      count: input.count, difficulty: input.difficulty, passages,
    });
  } catch (e) {
    if (e instanceof AiUnavailable) throw new ApiError(503, e.message);
    throw e;
  }
  const ids = await db.tx(async (q) => {
    const out: number[] = [];
    for (const d of drafts) {
      const [r] = await q.query<{ id: number }>(
        `INSERT INTO questions (topic_id, prompt, options, correct_index, explanation, difficulty, status, source, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'draft','ai_draft',$7) RETURNING id`,
        [input.topicId, d.prompt, JSON.stringify(d.options), d.correct_index, d.explanation, d.difficulty, user.id],
      );
      out.push(r.id);
    }
    return out;
  });
  await audit(db, user.id, "question.ai_draft", "topic", input.topicId, { count: ids.length }, clientIp(req));
  return ok({ created: ids.length, ids }, 201);
});
