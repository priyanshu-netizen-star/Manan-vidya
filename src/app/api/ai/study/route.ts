import { z } from "zod";
import { assertTopicAccess } from "@/lib/access";
import { STUDY_MODES, flashcards, studyReply, withFallback, type Flashcard, type StudyMode } from "@/lib/ai-features";
import { ChatMessages, lastUserText, logAi, safetyReply } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { approvedPassages } from "@/lib/grounding";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import type { Passage } from "@/lib/text";

const Input = z.object({
  topicId: z.coerce.number().int().positive(),
  mode: z.enum(Object.keys(STUDY_MODES) as [StudyMode, ...StudyMode[]]),
  messages: ChatMessages.default([]),
});

const OPENERS: Record<Exclude<StudyMode, "flashcards" | "chat">, string> = {
  simplify: "Explain the main idea of this topic simply.",
  steps: "Explain this topic step by step with a worked example.",
  notes: "Make revision notes for this topic.",
  quiz: "Quiz me on this topic.",
};

/** AI Study Assistant: every mode is grounded in the topic's teacher-approved material. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "learning.use");
  limit(req, `study:${user.id}`, 30, 600);
  const input = await body(req, Input);
  const topic = await assertTopicAccess(user, input.topicId);
  const question = lastUserText(input.messages);
  const safety = safetyReply(user, question);
  if (safety) return ok({ mode: "safety", answer: safety });

  const passages = await approvedPassages(topic.id, question || `${topic.name} ${topic.summary}`, input.mode === "notes" || input.mode === "flashcards" ? 10 : 6);
  const t = { subject: topic.subject, name: topic.name, level: topic.class_level };
  const userKey = String(user.id);

  if (input.mode === "flashcards") {
    const out = await withFallback(() => flashcards({ userKey, topic: t, passages }), () => bankCards(topic.id));
    await logAi(user, "study.flashcards", out.mode, "topic", topic.id, clientIp(req));
    return ok({ mode: out.mode, cards: out.result, notice: out.notice });
  }

  const mode = input.mode;
  const messages = question ? input.messages : [...input.messages, { role: "user" as const, content: mode === "chat" ? `Help me understand ${topic.name}.` : OPENERS[mode] }];
  const out = await withFallback(
    () => studyReply({ userKey, mode, topic: t, passages, messages }),
    () => (mode === "quiz" ? bankQuestion(topic.id) : fromMaterial(passages, mode === "notes")),
  );
  await logAi(user, `study.${mode}`, out.mode, "topic", topic.id, clientIp(req));
  return ok({ mode: out.mode, answer: out.result, notice: out.notice, sources: passages.slice(0, 3).map((p) => ({ title: p.title, text: p.text })) });
});

function fromMaterial(passages: Passage[], notes: boolean) {
  if (!passages.length) return "Your teacher has not approved any material for this topic yet. Ask your teacher about it.";
  const list = notes ? passages : passages.slice(0, 3);
  return `**${notes ? "Key points from" : "From"} your teacher's approved material**\n\n${list.map((p) => `- ${p.text}`).join("\n")}`;
}

async function bankQuestion(topicId: number) {
  const db = await getDb();
  const q = await db.one<{ prompt: string; options: string[] }>(
    "SELECT prompt, options FROM questions WHERE topic_id = $1 AND status = 'approved' ORDER BY random() LIMIT 1",
    [topicId],
  );
  if (!q) return "There are no approved practice questions for this topic yet.";
  return `**Practice question from your teacher's question bank**\n\n${q.prompt}\n\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")}\n\nThink it through, then take the topic's quiz to check your answer.`;
}

async function bankCards(topicId: number): Promise<Flashcard[]> {
  const db = await getDb();
  const rows = await db.query<{ prompt: string; options: string[]; correct_index: number; explanation: string }>(
    "SELECT prompt, options, correct_index, explanation FROM questions WHERE topic_id = $1 AND status = 'approved' ORDER BY id LIMIT 10",
    [topicId],
  );
  return rows.map((r) => ({ front: r.prompt, back: `${r.options[r.correct_index]}${r.explanation ? `. ${r.explanation}` : ""}` }));
}
