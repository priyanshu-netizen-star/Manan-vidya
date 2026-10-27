"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookText, Brain, Layers, ListOrdered, MessageCircle, NotebookPen, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { api } from "@/components/forms";
import { renderMarkdown } from "@/components/Markdown";
import { AiBadge, CopyButton, Thinking, type AiMode } from "@/components/ai/AiBits";

type Topic = { id: number; name: string; subject: string; level: number };
type Msg = { role: "user" | "assistant"; content: string; mode?: AiMode; notice?: string; sources?: { title: string; text: string }[] };
type Card = { front: string; back: string };
type Mode = "chat" | "simplify" | "steps" | "notes" | "flashcards" | "quiz";

const MODES: { id: Mode; label: string; Icon: typeof Sparkles; hint: string }[] = [
  { id: "chat", label: "Ask anything", Icon: MessageCircle, hint: "Ask a question about this topic" },
  { id: "simplify", label: "Explain simply", Icon: Wand2, hint: "A simple explanation with an everyday example" },
  { id: "steps", label: "Step by step", Icon: ListOrdered, hint: "A worked example, one step at a time" },
  { id: "notes", label: "Revision notes", Icon: NotebookPen, hint: "One-page notes for the whole topic" },
  { id: "flashcards", label: "Flashcards", Icon: Layers, hint: "Flip cards to test your memory" },
  { id: "quiz", label: "Quiz me", Icon: Brain, hint: "Practice questions, one at a time (not marked)" },
];

export function StudyAssistant({ topics, initialTopicId, aiEnabled }: { topics: Topic[]; initialTopicId: number | null; aiEnabled: boolean }) {
  const [topicId, setTopicId] = useState<number | null>(initialTopicId ?? topics[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [cards, setCards] = useState<{ mode: AiMode; cards: Card[]; notice?: string } | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const topic = topics.find((t) => t.id === topicId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  function reset(nextTopic: number | null = topicId) {
    setTopicId(nextTopic);
    setMessages([]);
    setCards(null);
    setFlipped(new Set());
    setError(null);
  }

  async function run(m: Mode, text?: string) {
    if (!topicId || busy) return;
    setMode(m);
    setError(null);
    if (m === "flashcards") {
      setBusy(true);
      try {
        setCards(await api("POST", "/api/ai/study", { topicId, mode: m, messages: [] }));
        setFlipped(new Set());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const q = text?.trim();
    const history: Msg[] = q ? [...messages, { role: "user", content: q }] : messages;
    if (q) setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const res = await api<{ mode: AiMode; answer: string; notice?: string; sources?: Msg["sources"] }>("POST", "/api/ai/study", {
        topicId, mode: m, messages: (q ? history : []).slice(-10).map((x) => ({ role: x.role, content: x.content.slice(0, 2000) })),
      });
      setMessages([...history, { role: "assistant", content: res.answer, mode: res.mode, notice: res.notice, sources: res.sources }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (input.trim().length < 2) return;
    void run(mode === "flashcards" || mode === "notes" ? "chat" : mode, input);
  }

  if (!topics.length) return <p className="text-sm text-muted">No topics are available yet.</p>;

  return (
    <div className="grid lg:grid-cols-[18rem_1fr] gap-5 items-start">
      <aside className="card card-pad space-y-4 lg:sticky lg:top-20">
        <div>
          <label htmlFor="study-topic" className="label">Topic</label>
          <select id="study-topic" className="select" value={topicId ?? ""} onChange={(e) => reset(Number(e.target.value))}>
            {[...new Set(topics.map((t) => t.subject))].map((s) => (
              <optgroup key={s} label={s}>
                {topics.filter((t) => t.subject === s).map((t) => <option key={t.id} value={t.id}>{t.name}{topics.some((x) => x.level !== t.level) ? ` (Class ${t.level})` : ""}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <p className="label">What would you like to do?</p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {MODES.map(({ id, label, Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => (id === "chat" ? setMode("chat") : void run(id))}
                disabled={busy}
                title={hint}
                aria-pressed={mode === id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors ${mode === id ? "border-brand bg-brand/10 text-brand font-semibold" : "border-line hover:border-brand/40"}`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          {aiEnabled ? "Uses only your teacher's approved material. AI can make mistakes: check with your teacher." : "AI is off: you will see your teacher's approved material and question bank instead."} Never type personal details.
        </p>
        {(messages.length > 0 || cards) && (
          <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => reset()}><RotateCcw className="w-3.5 h-3.5" aria-hidden /> Start again</button>
        )}
      </aside>

      <section className="card flex flex-col min-h-[32rem]">
        <header className="flex items-center gap-3 px-5 py-3.5 border-b border-line">
          <span className="icon-tile !w-9 !h-9 text-white" style={{ background: "linear-gradient(135deg,#6c5ce7,#00a8a4)" }} aria-hidden><Sparkles className="w-4 h-4" /></span>
          <div className="min-w-0">
            <h2 className="font-bold text-sm truncate">{topic ? topic.name : "Choose a topic"}</h2>
            <p className="text-xs text-muted">{topic ? `${topic.subject} · Class ${topic.level}` : ""} · {MODES.find((m) => m.id === mode)?.hint}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 max-h-[60vh]">
          {mode === "flashcards" && cards ? (
            <div className="space-y-3 animate-in">
              <AiBadge mode={cards.mode} />
              {cards.notice && <p className="text-xs text-muted">{cards.notice}</p>}
              {cards.cards.length ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {cards.cards.map((c, i) => {
                    const back = flipped.has(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFlipped((f) => { const n = new Set(f); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                        className={`min-h-28 rounded-2xl border p-4 text-left text-sm transition-all ${back ? "border-good/50 bg-good/5" : "border-line bg-surface-2 hover:border-brand/40"}`}
                        aria-label={back ? `Answer: ${c.back}` : `Card ${i + 1}: ${c.front}. Press to see the answer.`}
                      >
                        <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1">{back ? "Answer" : `Card ${i + 1}`}</span>
                        {back ? c.back : c.front}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted">No flashcards could be made for this topic yet.</p>}
            </div>
          ) : !messages.length && !busy ? (
            <div className="text-center py-10 animate-in">
              <span className="mx-auto icon-tile !w-14 !h-14 !rounded-2xl text-white" style={{ background: "linear-gradient(135deg,#6c5ce7,#00a8a4)" }} aria-hidden><BookText className="w-6 h-6" /></span>
              <p className="mt-4 font-display font-bold text-lg">What shall we learn{topic ? ` about ${topic.name}` : ""}?</p>
              <p className="text-sm text-muted mt-1 max-w-md mx-auto">Ask a question below, or pick a study mode on the left: simple explanations, step-by-step examples, revision notes, flashcards or practice questions.</p>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand text-white px-4 py-2 text-sm whitespace-pre-wrap">{m.content}</p></div>
              ) : (
                <div key={i} className="space-y-2 animate-in">
                  <div className="flex items-center justify-between gap-2"><AiBadge mode={m.mode ?? "automatic"} /><CopyButton text={m.content} /></div>
                  <div className="prose-school text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  {m.notice && <p className="text-xs text-muted">{m.notice}</p>}
                  {!!m.sources?.length && m.mode === "ai" && (
                    <details className="text-xs text-muted">
                      <summary className="cursor-pointer">Based on {m.sources.length} approved source{m.sources.length > 1 ? "s" : ""}</summary>
                      <ul className="mt-2 space-y-1.5">{m.sources.map((s, j) => <li key={j} className="rounded-lg bg-surface-2 p-2"><strong>{s.title}:</strong> {s.text}</li>)}</ul>
                    </details>
                  )}
                </div>
              ),
            )
          )}
          {busy && <Thinking label={mode === "notes" ? "Writing your notes" : mode === "flashcards" ? "Making flashcards" : "Thinking"} />}
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="border-t border-line p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-brand">
            <label htmlFor="study-input" className="sr-only">Your question</label>
            <textarea
              id="study-input"
              rows={1}
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
              placeholder={mode === "quiz" && messages.length ? "Type your answer…" : "Ask a question, in English or Hindi…"}
              className="flex-1 resize-none bg-transparent text-sm outline-none px-1.5 py-1 max-h-32"
            />
            <button className="btn btn-ai !p-2 rounded-xl" disabled={busy || input.trim().length < 2 || !topicId} aria-label="Send"><ArrowUp className="w-4 h-4" aria-hidden /></button>
          </div>
        </form>
      </section>
    </div>
  );
}
