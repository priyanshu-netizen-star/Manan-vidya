"use client";

import { useState, type ReactNode } from "react";
import { Bot, Check, Copy, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { renderMarkdown } from "@/components/Markdown";

export type AiMode = "ai" | "automatic" | "safety";

/** Every AI-related output says what produced it, so automatic text is never mistaken for AI. */
export function AiBadge({ mode }: { mode: AiMode }) {
  if (mode === "ai") return <span className="ai-chip"><Sparkles className="w-3 h-3" aria-hidden /> AI generated</span>;
  if (mode === "safety") return <span className="badge badge-bad"><ShieldAlert className="w-3 h-3" aria-hidden /> Safety message</span>;
  return <span className="badge" title="Produced by rules from approved content and records, without AI"><Bot className="w-3 h-3" aria-hidden /> Automatic (not AI)</span>;
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm !px-2"
      aria-label="Copy text"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? <Check className="w-3.5 h-3.5 text-good" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
      <span className="text-xs">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function AiOutput({ mode, text, notice, footer, copy = true }: { mode: AiMode; text: string; notice?: string; footer?: ReactNode; copy?: boolean }) {
  return (
    <div className={`${mode === "ai" ? "ai-card" : "card"} p-4 animate-in`} aria-live="polite">
      <div className="flex items-center justify-between gap-2 mb-2">
        <AiBadge mode={mode} />
        {copy && <CopyButton text={text} />}
      </div>
      <div className="prose-school text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
      {notice && <p className="text-xs text-muted mt-2">{notice}</p>}
      {mode === "ai" && <p className="text-[0.7rem] text-muted mt-2">AI can make mistakes. A person must check this before relying on it.</p>}
      {footer}
    </div>
  );
}

export function Thinking({ label = "Thinking" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="typing" aria-hidden><span /><span /><span /></span> {label}…
    </p>
  );
}

type Result = { mode: AiMode; text: string; notice?: string };

/** A button that calls an AI endpoint and shows the labelled result underneath. */
export function AiAction({
  endpoint, body, label, busyLabel = "Working", variant = "ai", description, className = "",
}: {
  endpoint: string; body?: unknown; label: string; busyLabel?: string; variant?: "ai" | "secondary"; description?: ReactNode; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`space-y-3 ${className}`}>
      {description && <p className="text-sm text-ink-2">{description}</p>}
      <button
        type="button"
        className={`btn ${variant === "ai" ? "btn-ai" : "btn-secondary"}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setRes(await api<Result>("POST", endpoint, body ?? {}));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles className="w-4 h-4" aria-hidden /> {res ? "Regenerate" : label}
      </button>
      {busy && <Thinking label={busyLabel} />}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {res && !busy && <AiOutput mode={res.mode} text={res.text} notice={res.notice} />}
    </div>
  );
}
