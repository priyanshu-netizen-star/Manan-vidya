"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/components/forms";
import { AiBadge, Thinking, type AiMode } from "@/components/ai/AiBits";

/** Teacher's remark editor: AI (or a template) suggests a draft; the teacher edits, saves and approves it. */
export function RemarkEditor({ studentId, examId, initial, status }: { studentId: number; examId: number; initial: string; status: "draft" | "approved" | null }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [suggested, setSuggested] = useState<AiMode | null>(null);
  const [busy, setBusy] = useState<"draft" | "save" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function suggest() {
    setBusy("draft");
    setMsg(null);
    try {
      const r = await api<{ mode: AiMode; text: string; notice?: string }>("POST", "/api/ai/remark", { studentId, examId });
      setText(r.text);
      setSuggested(r.mode);
      if (r.notice) setMsg({ ok: true, text: r.notice });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function save(approve: boolean) {
    setBusy("save");
    setMsg(null);
    try {
      await api("PUT", "/api/report-remarks", { studentId, examId, remark: text, approve, aiAssisted: suggested === "ai" });
      setMsg({ ok: true, text: approve ? "Remark approved: it now appears on the report card for the family." : "Draft saved. Families cannot see it until you approve it." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 ai-card p-4 no-print">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-sm">Class teacher&apos;s remark {status && <span className="badge ml-1">{status === "approved" ? "Approved" : "Draft"}</span>}</p>
        <button type="button" className="btn btn-ai btn-sm" onClick={suggest} disabled={!!busy}><Sparkles className="w-3.5 h-3.5" aria-hidden /> Suggest a remark</button>
      </div>
      {busy === "draft" && <div className="mt-2"><Thinking label="Drafting a remark" /></div>}
      {suggested && <div className="mt-2"><AiBadge mode={suggested} /> <span className="text-xs text-muted">Edit it so it sounds like you. You decide the final words.</span></div>}
      <label htmlFor="remark" className="sr-only">Remark</label>
      <textarea id="remark" className="textarea mt-2" rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a short, encouraging remark for the family." />
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy || text.trim().length < 5} onClick={() => save(false)}>Save draft</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!!busy || text.trim().length < 5} onClick={() => save(true)}>Approve remark</button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs mt-2 ${msg.ok ? "text-muted" : "text-bad"}`}>{msg.text}</p>}
    </div>
  );
}
