import { overlapScore, tokenize } from "./text";
import { admissionsSensitivity } from "./safety";

export type KbEntry = {
  id: number;
  category: string;
  question_en: string;
  answer_en: string;
  question_hi: string;
  answer_hi: string;
  keywords: string;
  source: string;
  verification: "public_source" | "pending_school" | "school_confirmed";
  hindi_reviewed: boolean;
};

export type AssistantDecision =
  | { mode: "knowledge_base"; matches: { entry: KbEntry; score: number }[] }
  | { mode: "escalated"; reason: string; matches: { entry: KbEntry; score: number }[] };

/** Minimum share of the question's meaningful words that must match an entry. */
export const KB_CONFIDENCE = 0.5;

/**
 * Decide how the admissions assistant answers. The assistant only ever answers from the
 * knowledge base; anything sensitive or not confidently covered goes to a person.
 */
export function decideAssistantReply(question: string, entries: KbEntry[]): AssistantDecision {
  const sensitive = admissionsSensitivity(question);
  const q = tokenize(question);
  const scored = entries
    .map((entry) => {
      const doc = new Set(tokenize(`${entry.question_en} ${entry.question_hi} ${entry.category}`));
      const kw = new Set(tokenize(entry.keywords.replace(/,/g, " ")));
      return { entry, score: overlapScore(q, doc, kw) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  if (sensitive) return { mode: "escalated", reason: sensitive, matches: scored.slice(0, 1) };
  if (!q.length) return { mode: "escalated", reason: "Please type your question in a few words.", matches: [] };
  const confident = scored.filter((m) => m.score >= KB_CONFIDENCE).slice(0, 2);
  if (!confident.length) {
    return {
      mode: "escalated",
      reason: "This question is not covered by the information the school has verified for the assistant.",
      matches: [],
    };
  }
  return { mode: "knowledge_base", matches: confident };
}

export const VERIFICATION_LABEL: Record<KbEntry["verification"], string> = {
  public_source: "From the school's public website (awaiting school confirmation)",
  pending_school: "Awaiting school confirmation",
  school_confirmed: "Confirmed by the school",
};
