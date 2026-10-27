import { z } from "zod";
import { classInsights, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { questionAnalysis, topicPerformance } from "@/lib/queries";

const Input = z.object({ classId: z.coerce.number().int().positive().optional() });

type Weak = { topic: string; className: string; avg: number | null; students: number; size: number; questions: { prompt: string; pct: number; answered: number; commonWrong: string | null; correct: string }[] };

/** Misconception and re-teaching insights from practice-quiz results (teacher's own classes only). */
export const POST = route(async (req) => {
  const user = await apiUser(req, "performance.view");
  limit(req, `insights:${user.id}`, 10, 600);
  const { classId } = await body(req, Input);
  const rows = (await topicPerformance({ teacherId: user.role === "teacher" ? user.id : undefined, classId })).filter((r) => r.avg_percent != null).slice(0, 4);
  const db = await getDb();
  const weak: Weak[] = [];
  for (const r of rows) {
    const quizzes = await db.query<{ id: number }>("SELECT id FROM quizzes WHERE topic_id = $1 AND class_id = $2 AND status = 'published'", [r.topic_id, r.class_id]);
    const qs = (await Promise.all(quizzes.map((q) => questionAnalysis(q.id)))).flat().filter((q) => q.answered > 0);
    weak.push({
      topic: r.topic, className: r.class_name, avg: r.avg_percent, students: r.students, size: r.class_size,
      questions: qs
        .map((q) => ({ prompt: q.prompt, pct: Math.round((100 * q.correct) / q.answered), answered: q.answered, commonWrong: q.common_wrong == null ? null : q.options[q.common_wrong], correct: q.options[q.correct_index] }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3),
    });
  }
  if (!weak.length) return ok({ mode: "automatic", text: "There are no practice-quiz results for these classes yet." });
  const data = weak
    .map((w) => `Topic: ${w.topic} (${w.className}) · class average ${w.avg}% · ${w.students}/${w.size} students attempted\n${w.questions
      .map((q) => `  - "${q.prompt}": ${q.pct}% correct of ${q.answered}; correct answer "${q.correct}"${q.commonWrong ? `; most common wrong answer "${q.commonWrong}"` : ""}`)
      .join("\n")}`)
    .join("\n\n");
  const out = await withFallback(
    () => classInsights({ userKey: String(user.id), data }),
    () => weak
      .map((w) => `**${w.topic} (${w.className}), average ${w.avg}%**\n${w.questions.map((q) => `- ${q.pct}% answered "${q.prompt}" correctly${q.commonWrong ? `; most chose "${q.commonWrong}" instead of "${q.correct}"` : ""}.`).join("\n")}`)
      .join("\n\n"),
  );
  await logAi(user, "class_insights", out.mode, undefined, undefined, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});
