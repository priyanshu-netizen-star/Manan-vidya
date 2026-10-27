import { z } from "zod";
import { assertTopicAccess } from "@/lib/access";
import { AiUnavailable, askTutor } from "@/lib/ai";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { apiUser, body, limit, ok, route } from "@/lib/http";
import { WELLBEING_MESSAGE, screenStudentInput } from "@/lib/safety";
import { isHindi, leadingPassages, rankPassages } from "@/lib/text";

const Ask = z.object({ topicId: z.coerce.number().int().positive(), question: z.string().trim().min(3).max(1000) });

/**
 * Student question answering. Order of operations:
 * 1. permission + topic scope, 2. child-safety screening, 3. retrieval from APPROVED material only,
 * 4. Claude explanation grounded in those passages when configured; otherwise the passages
 *    themselves, clearly labelled as not AI.
 */
export const POST = route(async (req) => {
  const user = await apiUser(req, "learning.use");
  limit(req, `ask:${user.id}`, 20, 600);
  const { topicId, question } = await body(req, Ask);
  const topic = await assertTopicAccess(user, topicId);
  const lang = isHindi(question) ? "hi" : "en";

  const screen = screenStudentInput(question);
  if (screen.kind === "wellbeing") return ok({ mode: "safety", answer: WELLBEING_MESSAGE[lang], sources: [] });
  if (screen.kind === "personal_info") {
    return ok({ mode: "safety", answer: "Please do not share phone numbers, email addresses or other personal details here. Ask your question without them.", sources: [] });
  }

  const db = await getDb();
  const materials = await db.query<{ id: number; title: string; body: string }>(
    "SELECT id, title, body FROM materials WHERE topic_id = $1 AND status = 'approved'",
    [topicId],
  );
  const passages = rankPassages(question, materials, 3);
  const sources = passages.map((p) => ({ title: p.title, text: p.text }));

  let result: { mode: "ai" | "materials"; answer: string; notice?: string };
  if (!aiConfigured()) {
    result = {
      mode: "materials",
      answer: "",
      notice: "The AI service is not configured for this deployment, so no AI explanation was generated. These are the most relevant parts of the material your teacher approved.",
    };
  } else {
    try {
      const answer = await askTutor({
        userKey: String(user.id), question, subject: topic.subject, topic: topic.name, classLevel: topic.class_level,
        // Keyword search is English-only; when nothing matches, give the model the topic's approved material to work from.
        passages: passages.length ? passages : leadingPassages(materials),
      });
      result = { mode: "ai", answer };
    } catch (e) {
      if (!(e instanceof AiUnavailable)) throw e;
      result = { mode: "materials", answer: "", notice: `${e.message} Showing the most relevant approved material instead.` };
    }
  }

  if (user.studentId) {
    await db.query("INSERT INTO learning_events (student_id, topic_id, kind, detail) VALUES ($1,$2,'question_asked',$3)", [
      user.studentId, topicId, JSON.stringify({ question: question.slice(0, 300), mode: result.mode }),
    ]);
  }
  return ok({ ...result, sources });
});
