"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleAlert, CircleCheck, CircleDot, Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { AiOutput, Thinking, type AiMode } from "./AiBits";

type Fact = { text: string; tone: "attention" | "info" | "good"; href?: string };

const TONE = {
  attention: { Icon: CircleAlert, cls: "text-[#e09b00]" },
  info: { Icon: CircleDot, cls: "text-brand" },
  good: { Icon: CircleCheck, cls: "text-good" },
};

/** Today's briefing: the live facts are always shown; an AI-written summary is generated on request. */
export function Briefing({ facts, aiEnabled, title = "Today at a glance", scope = "role" }: { facts: Fact[]; aiEnabled: boolean; title?: string; scope?: "role" | "hostel" }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ mode: AiMode; text: string; notice?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attention = facts.filter((f) => f.tone === "attention").length;
  return (
    <section className="ai-card p-5" aria-labelledby="briefing-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="briefing-title" className="font-display font-bold text-lg">{title}</h2>
          <p className="text-xs text-muted">{attention ? `${attention} item${attention > 1 ? "s need" : " needs"} attention` : "Nothing urgent"} · live from your records</p>
        </div>
        <button
          type="button"
          className="btn btn-ai btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              setRes(await api("POST", "/api/ai/briefing", { scope }));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden /> {res ? "Regenerate" : aiEnabled ? "AI briefing" : "Summarise"}
        </button>
      </div>
      <ul className="mt-4 grid md:grid-cols-2 gap-2">
        {facts.map((f, i) => {
          const { Icon, cls } = TONE[f.tone];
          const body = (
            <>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cls}`} aria-hidden />
              <span className="flex-1">{f.text}</span>
              {f.href && <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted group-hover:text-brand" aria-hidden />}
            </>
          );
          return (
            <li key={i}>
              {f.href ? (
                <Link href={f.href} className="group flex gap-2.5 rounded-xl bg-surface-2/70 px-3 py-2.5 text-sm hover:bg-brand/5 transition-colors">{body}</Link>
              ) : (
                <div className="flex gap-2.5 rounded-xl bg-surface-2/70 px-3 py-2.5 text-sm">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {busy && <div className="mt-4"><Thinking label="Writing your briefing" /></div>}
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {res && !busy && <div className="mt-4"><AiOutput mode={res.mode} text={res.text} notice={res.notice} /></div>}
    </section>
  );
}
