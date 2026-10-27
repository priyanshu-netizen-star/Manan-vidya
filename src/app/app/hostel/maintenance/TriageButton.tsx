"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { AiBadge, type AiMode } from "@/components/ai/AiBits";

type Suggestion = { mode: AiMode; category: string; priority: string; reason: string; notice?: string };

/** Suggests category and priority from the description and fills the form. The person filing it decides. */
export function TriageButton() {
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-ai btn-sm"
        disabled={busy}
        onClick={async () => {
          const desc = (document.getElementById("mr-desc") as HTMLTextAreaElement | null)?.value ?? "";
          if (desc.trim().length < 5) return setError("Describe the problem first.");
          setBusy(true);
          setError(null);
          try {
            const r = await api<Suggestion>("POST", "/api/ai/triage", { description: desc });
            const cat = document.getElementById("mr-cat") as HTMLSelectElement | null;
            const pri = document.getElementById("mr-pri") as HTMLSelectElement | null;
            if (cat) cat.value = r.category;
            if (pri) pri.value = r.priority;
            setS(r);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden /> {busy ? "Suggesting…" : "Suggest category and priority"}
      </button>
      {s && (
        <p className="text-xs text-ink-2 flex flex-wrap items-center gap-1.5" role="status">
          <AiBadge mode={s.mode} /> Suggested <strong>{s.category}</strong>, <strong>{s.priority}</strong>. {s.reason} Change them if needed.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}
