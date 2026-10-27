"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/components/forms";
import { AiAction } from "@/components/ai/AiBits";

type Q = { id: number; prompt: string; options: string[] };
type Result = {
  score: number; total: number; percent: number; saved: boolean;
  results: { questionId: number; chosen: number | null; correctIndex: number; isCorrect: boolean }[];
  explanations: Record<string, string>;
};

export function QuizRunner({ quizId, questions, topicId }: { quizId: number; questions: Q[]; topicId: number }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const answered = Object.keys(answers).length;

  async function submit() {
    if (answered < questions.length && !window.confirm(`You have answered ${answered} of ${questions.length} questions. Submit anyway?`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<Result>("POST", `/api/quizzes/${quizId}/attempt`, { answers });
      setResult(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map(result?.results.map((r) => [r.questionId, r]));

  return (
    <div>
      {result && (
        <div className="card card-pad mb-5" role="status" data-testid="quiz-result">
          <p className="text-sm text-muted">Your score</p>
          <p className="text-3xl font-bold font-display">
            {result.score} / {result.total} <span className="text-lg text-muted">({result.percent}%)</span>
          </p>
          <p className="text-sm text-ink-2 mt-1">
            {result.percent >= 80 ? "Excellent: this topic looks secure." : result.percent >= 50 ? "Good progress. Read the explanations below for the ones you missed." : "Read the explanations below, revise the material, and try again."}
            {!result.saved && " (Preview: not saved.)"}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>
            <Link href={`/app/learn/${topicId}`} className="btn btn-secondary btn-sm">Back to topic</Link>
            <Link href="/app/progress" className="btn btn-secondary btn-sm">My progress</Link>
          </div>
        </div>
      )}
      <ol className="space-y-4">
        {questions.map((q, qi) => {
          const r = byId.get(q.id);
          return (
            <li key={q.id} className="card card-pad">
              <fieldset disabled={!!result}>
                <legend className="font-semibold text-ink mb-3">
                  <span className="text-muted mr-1.5">{qi + 1}.</span>
                  {q.prompt}
                </legend>
                <div className="space-y-2">
                  {q.options.map((o, oi) => {
                    const chosen = answers[q.id] === oi;
                    const isCorrect = r && r.correctIndex === oi;
                    const wrongPick = r && r.chosen === oi && !r.isCorrect;
                    return (
                      <label
                        key={oi}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer ${
                          isCorrect ? "border-good bg-good/10" : wrongPick ? "border-bad bg-bad/10" : chosen ? "border-brand bg-brand/5" : "border-line hover:border-brand/40"
                        }`}
                      >
                        <input type="radio" name={`q-${q.id}`} className="accent-[#6c5ce7]" checked={chosen} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                        <span className="flex-1">{o}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-good" aria-label="Correct answer" />}
                        {wrongPick && <XCircle className="w-4 h-4 text-bad" aria-label="Your answer" />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {r && (
                <div className={`mt-3 text-sm rounded-lg p-3 ${r.isCorrect ? "bg-good/10" : "bg-surface-2"}`}>
                  <p className="font-semibold">{r.isCorrect ? "Correct" : r.chosen === null ? "Not answered" : "Not quite"}</p>
                  {!r.isCorrect && <p className="mt-1">Correct answer: <strong>{q.options[r.correctIndex]}</strong></p>}
                  <p className="mt-1 text-ink-2">{result?.explanations[q.id]}</p>
                  {!r.isCorrect && result?.saved && (
                    <AiAction className="mt-3" endpoint="/api/ai/explain" body={{ questionId: q.id, chosen: r.chosen }} label="Explain my mistake" busyLabel="Explaining" />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!result && (
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Marking…" : "Submit answers"}
          </button>
          <span className="text-sm text-muted">{answered} of {questions.length} answered</span>
          {error && <span role="alert" className="text-sm text-bad">{error}</span>}
        </div>
      )}
    </div>
  );
}
