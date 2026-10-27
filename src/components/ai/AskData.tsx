"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { AiOutput, Thinking, type AiMode } from "./AiBits";

type Res = { mode: AiMode; notice?: string; report: string; title: string; reason: string; summary: string; head: string[]; rows: (string | number | null)[][]; total: number };

const EXAMPLES = ["Which students have low attendance?", "How did the latest exams go by subject?", "Where are admission enquiries stuck?", "Which classes use practice quizzes least?"];

/**
 * "Ask your data": a plain-English question is routed to one of the standard reports (never free-form
 * database queries), which runs with the user's normal permissions and is explained in plain English.
 * With `report`, it explains that one report instead.
 */
export function AskData({ report, compact = false }: { report?: string; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    setBusy(true);
    setError(null);
    try {
      setRes(await api<Res>("POST", "/api/ai/ask-data", report ? { report, question } : { question }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 3) void ask(q.trim());
  }

  return (
    <div className="space-y-3">
      {report ? (
        <button type="button" className="btn btn-ai btn-sm" disabled={busy} onClick={() => void ask("")}>
          <Sparkles className="w-3.5 h-3.5" aria-hidden /> {res ? "Explain again" : "Explain this report"}
        </button>
      ) : (
        <>
          <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-brand">
            <Sparkles className="w-4 h-4 text-brand ml-1.5 shrink-0" aria-hidden />
            <label htmlFor="ask-data" className="sr-only">Ask a question about school data</label>
            <input id="ask-data" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Ask about attendance, exams, enquiries or quizzes…" className="flex-1 bg-transparent text-sm outline-none py-1.5 min-w-0" />
            <button className="btn btn-ai !p-2 rounded-xl" disabled={busy || q.trim().length < 3} aria-label="Ask"><ArrowUp className="w-4 h-4" aria-hidden /></button>
          </form>
          {!compact && !res && (
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => <button key={ex} type="button" onClick={() => { setQ(ex); void ask(ex); }} className="badge hover:border-brand/50 hover:text-brand cursor-pointer">{ex}</button>)}
            </div>
          )}
        </>
      )}
      {busy && <Thinking label="Reading the report" />}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {res && !busy && (
        <AiOutput
          mode={res.mode}
          text={res.summary}
          notice={[!report && res.reason ? `Answered from the report “${res.title}”. ${res.reason}` : "", res.notice ?? ""].filter(Boolean).join(" ")}
          footer={!report && res.rows.length > 0 ? (
            <details className="mt-3">
              <summary className="text-xs font-semibold text-brand cursor-pointer">Show the data ({res.total} row{res.total === 1 ? "" : "s"})</summary>
              <div className="table-wrap mt-2">
                <table className="table text-xs">
                  <thead><tr>{res.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{res.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c ?? "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <Link href={`/app/reports?r=${res.report}`} className="text-xs font-semibold text-brand mt-2 inline-block">Open the full report →</Link>
            </details>
          ) : undefined}
        />
      )}
    </div>
  );
}
