import { z } from "zod";
import { assertTeachesClassTopic } from "@/lib/access";
import { AiUnavailable, draftLessonPlan } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { classTopic } from "@/lib/schemas";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { lessonTemplate } from "@/lib/lesson-template";
import { rankPassages } from "@/lib/text";

const Generate = z.object({
  classTopic,
  minutes: z.coerce.number().int().min(20).max(120).default(40),
  focus: z.string().trim().max(400).default(""),
});

/**
 * Lesson preparation. With AI configured, Claude drafts a plan from approved material.
 * Without it, a template is built from approved material and the question bank.
 * Either way the plan is saved as a draft for the teacher to edit and mark reviewed.
 */
export const POST = route(async (req) => {
  const user = await apiUser(req, "ai.teacher_tools");
  limit(req, `lesson:${user.id}`, 10, 600);
  const raw = await body(req, Generate);
  const input = { ...raw, ...raw.classTopic };
  await assertTeachesClassTopic(user, input.classId, input.topicId);
  const db = await getDb();
  const topic = await db.one<{ name: string; summary: string; subject: string; class_level: number; class_name: string }>(
    `SELECT t.name, t.summary, s.name AS subject, t.class_level, (SELECT name FROM classes WHERE id = $2) AS class_name
       FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = $1`,
    [input.topicId, input.classId],
  );
  if (!topic) throw new ApiError(404, "Topic not found");
  const materials = await db.query<{ id: number; title: string; body: string }>(
    "SELECT id, title, body FROM materials WHERE topic_id = $1 AND status = 'approved'",
    [input.topicId],
  );
  const passages = rankPassages(`${topic.name} ${topic.summary} ${input.focus}`, materials, 6);

  let content: string;
  let generation: "ai" | "template" = "template";
  let notice: string | null = null;
  if (aiConfigured()) {
    try {
      content = await draftLessonPlan({
        userKey: String(user.id), subject: topic.subject, topic: topic.name, classLevel: topic.class_level,
        minutes: input.minutes, focus: input.focus, passages,
      });
      generation = "ai";
    } catch (e) {
      if (!(e instanceof AiUnavailable)) throw e;
      notice = `${e.message} A template was created from approved material instead.`;
    }
  } else {
    notice = "AI is not configured for this deployment, so a template was built from approved material and the question bank.";
  }
  if (generation === "template") {
    const questions = await db.query<{ prompt: string; options: string[]; correct_index: number }>(
      "SELECT prompt, options, correct_index FROM questions WHERE topic_id = $1 AND status = 'approved' ORDER BY id LIMIT 3",
      [input.topicId],
    );
    content = lessonTemplate({ subject: topic.subject, topic: topic.name, className: topic.class_name, minutes: input.minutes, focus: input.focus, passages, questions });
  }
  const row = await db.one<{ id: number }>(
    "INSERT INTO lesson_plans (teacher_id, topic_id, class_id, title, content, generation, status) VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING id",
    [user.id, input.topicId, input.classId, `${topic.name} (${input.minutes} min)`, content!, generation],
  );
  await audit(db, user.id, "lesson.generate", "lesson_plan", row!.id, { generation }, clientIp(req));
  return ok({ id: row!.id, generation, notice }, 201);
});
