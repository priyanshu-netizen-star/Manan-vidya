"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, RotateCcw, Sparkles, X } from "lucide-react";
import { api } from "@/components/forms";
import { renderMarkdown } from "@/components/Markdown";
import { AiBadge, Thinking, type AiMode } from "./AiBits";

type Msg = { role: "user" | "assistant"; content: string; mode?: AiMode; notice?: string; links?: { href: string; text: string }[] };

export const COPILOT_EVENT = "copilot:ask";

/** Opens the Copilot from anywhere (for example the command palette), optionally with a question. */
export function askCopilot(question?: string) {
  window.dispatchEvent(new CustomEvent(COPILOT_EVENT, { detail: question ?? "" }));
}

export function CopilotButton() {
  return (
    <button type="button" className="btn btn-ai btn-sm" onClick={() => askCopilot()} aria-label="Ask AI Copilot">
      <Sparkles className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}

/** Role-aware assistant available on every page. It sees only what the signed-in user may see. */
export function Copilot({ firstName, suggestions, aiEnabled }: { firstName: string; suggestions: string[]; aiEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(history);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ mode: AiMode; answer: string; notice?: string; links: Msg["links"] }>("POST", "/api/ai/copilot", {
        messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
      });
      setMessages([...history, { role: "assistant", content: res.answer, mode: res.mode, notice: res.notice, links: res.links }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string>).detail;
      if (q) void send(q);
      else setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener(COPILOT_EVENT, onAsk);
    return () => window.removeEventListener(COPILOT_EVENT, onAsk);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => askCopilot()}
          className="fixed bottom-5 right-5 z-40 btn btn-ai rounded-full !px-4 !py-3 shadow-xl no-print"
          aria-label="Open AI Copilot"
        >
          <Sparkles className="w-5 h-5" aria-hidden /> <span className="hidden sm:inline">AI Copilot</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end no-print" role="dialog" aria-modal="true" aria-label="AI Copilot">
          <button type="button" className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-label="Close Copilot" onClick={() => setOpen(false)} />
          <section className="relative w-full sm:w-[26rem] h-full bg-surface border-l border-line shadow-2xl flex flex-col animate-in">
            <header className="flex items-center gap-3 px-4 h-16 border-b border-line">
              <span className="icon-tile !w-9 !h-9 text-white" style={{ background: "linear-gradient(135deg,#6c5ce7,#00a8a4)" }}><Sparkles className="w-4 h-4" aria-hidden /></span>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm">AI Copilot</h2>
                <p className="text-xs text-muted truncate">{aiEnabled ? "Answers from your own data and the user guide" : "AI is off: answers come from your data and the user guide"}</p>
              </div>
              {messages.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setMessages([])} aria-label="Start a new conversation"><RotateCcw className="w-4 h-4" aria-hidden /></button>
              )}
              <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setOpen(false)} aria-label="Close Copilot"><X className="w-4 h-4" aria-hidden /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!messages.length && (
                <div className="animate-in">
                  <p className="font-display text-lg font-bold">Hi {firstName}, how can I help?</p>
                  <p className="text-sm text-muted mt-1">I can see what needs your attention and explain how to do things here. I never make decisions for you.</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => void send(s)} className="text-left text-sm rounded-xl border border-line px-3 py-2 hover:border-brand/50 hover:bg-brand/5 transition-colors">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand text-white px-3.5 py-2 text-sm whitespace-pre-wrap">{m.content}</p></div>
                ) : (
                  <div key={i} className="space-y-2">
                    <AiBadge mode={m.mode ?? "automatic"} />
                    <div className="prose-school text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    {m.notice && <p className="text-xs text-muted">{m.notice}</p>}
                    {!!m.links?.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="badge badge-brand hover:opacity-80 !whitespace-normal text-left" title={l.text}>
                            {l.text.length > 52 ? `${l.text.slice(0, 50)}…` : l.text} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
              {busy && <Thinking />}
              {error && <p role="alert" className="text-sm text-bad">{error}</p>}
              <div ref={endRef} />
            </div>
            <form onSubmit={submit} className="border-t border-line p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-brand">
                <label htmlFor="copilot-input" className="sr-only">Message the Copilot</label>
                <textarea
                  id="copilot-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={2000}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                  placeholder="Ask anything about your work…"
                  className="flex-1 resize-none bg-transparent text-sm outline-none px-1.5 py-1 max-h-32"
                />
                <button className="btn btn-ai !p-2 rounded-xl" disabled={busy || !input.trim()} aria-label="Send"><ArrowUp className="w-4 h-4" aria-hidden /></button>
              </div>
              <p className="text-[0.68rem] text-muted mt-1.5 px-1">Never type passwords or personal details. AI can make mistakes.</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
