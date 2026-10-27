/** Quiz scoring. Runs only on the server: correct answers are never sent to the browser before submission. */

export type ScorableQuestion = { id: number; correct_index: number; options: string[] };
export type QuestionResult = { questionId: number; chosen: number | null; correctIndex: number; isCorrect: boolean };
export type QuizScore = { score: number; total: number; percent: number; results: QuestionResult[] };

export function scoreQuiz(questions: ScorableQuestion[], answers: Record<string, number | null | undefined>): QuizScore {
  const known = new Set(questions.map((q) => String(q.id)));
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) throw new Error(`Answer submitted for a question that is not in this quiz: ${key}`);
  }
  const results = questions.map((q) => {
    const raw = answers[String(q.id)];
    const valid = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < q.options.length;
    const chosen = valid ? raw : null;
    return { questionId: q.id, chosen, correctIndex: q.correct_index, isCorrect: chosen === q.correct_index };
  });
  const score = results.filter((r) => r.isCorrect).length;
  const total = questions.length;
  return { score, total, percent: total ? Math.round((score / total) * 100) : 0, results };
}

/** Topic mastery band used in progress views. Descriptive only, never used for automated decisions. */
export function masteryBand(percent: number | null): "not_started" | "needs_support" | "developing" | "secure" {
  if (percent == null) return "not_started";
  if (percent < 50) return "needs_support";
  if (percent < 80) return "developing";
  return "secure";
}

export const MASTERY_LABEL = {
  not_started: "Not started",
  needs_support: "Needs support",
  developing: "Developing",
  secure: "Secure",
} as const;
