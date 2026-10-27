import { z } from "zod";
import { AiUnavailable, phraseAdmissionsAnswer } from "@/lib/ai";
import { aiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";
import { clientIp, body, limit, ok, route } from "@/lib/http";
import { VERIFICATION_LABEL, decideAssistantReply, type KbEntry } from "@/lib/kb";
import { isHindi } from "@/lib/text";

const Ask = z.object({ question: z.string().trim().min(2).max(500), lang: z.enum(["en", "hi", "auto"]).default("auto") });

const HANDOFF = {
  en: "I can't answer this reliably, so I won't guess. Please leave an enquiry below and a member of the admissions team will contact you.",
  hi: "मैं इसका भरोसेमंद उत्तर नहीं दे सकता, इसलिए अनुमान नहीं लगाऊँगा। कृपया नीचे पूछताछ दर्ज करें, प्रवेश टीम का सदस्य आपसे संपर्क करेगा।",
};

/**
 * Public admissions assistant. Answers only from published knowledge-base entries.
 * Sensitive or uncovered questions are handed to staff. Questions are logged without
 * any identity so staff can see what parents ask and fill gaps.
 */
export const POST = route(async (req) => {
  limit(req, "assistant", 30, 600);
  const input = await body(req, Ask);
  const lang: "en" | "hi" = input.lang === "auto" ? (isHindi(input.question) ? "hi" : "en") : input.lang;
  const db = await getDb();
  const entries = await db.query<KbEntry>("SELECT * FROM kb_entries WHERE published ORDER BY id");
  const decision = decideAssistantReply(input.question, entries);

  if (decision.mode === "escalated") {
    await db.query("INSERT INTO assistant_logs (question, language, mode, matched_ids, escalation_reason) VALUES ($1,$2,'escalated',$3,$4)", [
      input.question.slice(0, 500), lang, JSON.stringify(decision.matches.map((m) => m.entry.id)), decision.reason,
    ]);
    return ok({ mode: "escalated", lang, reason: decision.reason, answer: HANDOFF[lang], sources: [] });
  }

  const sources = decision.matches.map(({ entry }) => ({
    id: entry.id,
    question: lang === "hi" && entry.question_hi ? entry.question_hi : entry.question_en,
    answer: lang === "hi" && entry.answer_hi ? entry.answer_hi : entry.answer_en,
    verification: VERIFICATION_LABEL[entry.verification],
    verified: entry.verification === "school_confirmed",
    translationPending: lang === "hi" && !entry.hindi_reviewed,
    source: entry.source,
  }));

  let mode: "knowledge_base" | "ai" = "knowledge_base";
  let answer = sources[0].answer;
  if (aiConfigured()) {
    try {
      answer = await phraseAdmissionsAnswer({ userKey: `ip:${clientIp(req)}`, question: input.question, lang, entries: decision.matches.map((m) => m.entry) });
      mode = "ai";
    } catch (e) {
      if (!(e instanceof AiUnavailable)) throw e;
    }
  }
  await db.query("INSERT INTO assistant_logs (question, language, mode, matched_ids) VALUES ($1,$2,$3,$4)", [
    input.question.slice(0, 500), lang, mode, JSON.stringify(sources.map((s) => s.id)),
  ]);
  return ok({ mode, lang, answer, sources });
});
