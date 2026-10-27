"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, Search, Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { askCopilot } from "@/components/ai/Copilot";

type Item = { kind: string; label: string; sub?: string; href?: string; ai?: string };

/** Ctrl/⌘ + K palette: jump to any page, find records the role may open, or hand the question to the AI Copilot. */
export function CommandPalette({ pages }: { pages: { label: string; href: string; group: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const res = await api<{ results: Item[] }>("GET", `/api/search?q=${encodeURIComponent(q.trim())}`);
        setRecords(res.results);
      } catch {
        setRecords([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const pageHits = pages
      .filter((p) => !term || p.label.toLowerCase().includes(term) || p.group.toLowerCase().includes(term))
      .slice(0, term ? 6 : 8)
      .map((p) => ({ kind: "Page", label: p.label, sub: p.group, href: p.href }));
    const ai: Item[] = term.length >= 3 ? [{ kind: "Ask AI", label: `Ask the AI Copilot: “${q.trim()}”`, ai: q.trim() }] : [];
    return [...ai, ...pageHits, ...(term.length >= 2 ? records : [])];
  }, [q, pages, records]);

  function choose(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    setQ("");
    setRecords([]);
    if (item.ai) askCopilot(item.ai);
    else if (item.href) router.push(item.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-1.5 text-sm text-muted hover:border-brand/40 transition-colors min-w-0 sm:w-64"
        aria-label="Search pages and records"
      >
        <Search className="w-4 h-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline truncate">Search or ask AI…</span>
        <span className="hidden md:inline ml-auto kbd">Ctrl K</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] no-print" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close search" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl card !shadow-2xl overflow-hidden animate-in">
            <div className="flex items-center gap-2 px-4 border-b border-line">
              <Search className="w-4 h-4 text-muted" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter") { e.preventDefault(); choose(items[index]); }
                }}
                placeholder="Search pages, students, enquiries, topics… or ask a question"
                aria-label="Search"
                className="flex-1 bg-transparent py-3.5 text-sm outline-none"
              />
              <span className="kbd">Esc</span>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
              {items.length ? items.map((item, i) => (
                <li key={`${item.kind}-${item.href ?? item.ai}-${i}`} role="option" aria-selected={i === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => choose(item)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === index ? "bg-brand/10" : ""}`}
                  >
                    {item.ai ? <Sparkles className="w-4 h-4 text-brand shrink-0" aria-hidden /> : <ArrowRight className="w-4 h-4 text-muted shrink-0" aria-hidden />}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.sub && <span className="block truncate text-xs text-muted">{item.sub}</span>}
                    </span>
                    <span className={item.ai ? "ai-chip" : "badge"}>{item.kind}</span>
                    {i === index && <CornerDownLeft className="w-3.5 h-3.5 text-muted" aria-hidden />}
                  </button>
                </li>
              )) : <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
