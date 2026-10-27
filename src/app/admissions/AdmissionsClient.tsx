"use client";

import { useRef, useState, type FormEvent } from "react";
import { BadgeCheck, CircleAlert, Send, UserRound } from "lucide-react";
import { api, formToJson } from "@/components/forms";
import { fmtDate } from "@/lib/dates";

type Lang = "en" | "hi";
type Source = { id: number; question: string; answer: string; verification: string; verified: boolean; translationPending: boolean; source: string };
type Reply = { mode: "knowledge_base" | "ai" | "escalated"; lang: Lang; answer: string; reason?: string; sources: Source[] };
type Msg = { from: "user"; text: string } | { from: "bot"; reply: Reply };

const T = {
  en: {
    title: "Ask a question",
    placeholder: "e.g. Which documents are required for admission?",
    send: "Ask",
    chips: ["What is the admission process?", "Which documents are needed?", "Is there a hostel?", "What is the age criteria?", "Class XI streams"],
    handoff: "Passed to staff",
    from: "Based on",
    pending: "Hindi translation awaiting school review",
    ai: "Reworded by AI from the verified answer",
    leave: "Leave an enquiry",
  },
  hi: {
    title: "प्रश्न पूछें",
    placeholder: "जैसे: प्रवेश के लिए कौन से दस्तावेज़ चाहिए?",
    send: "पूछें",
    chips: ["प्रवेश प्रक्रिया क्या है?", "कौन से दस्तावेज़ चाहिए?", "क्या हॉस्टल है?", "आयु मानदंड क्या है?", "कक्षा XI की स्ट्रीम"],
    handoff: "स्टाफ को भेजा गया",
    from: "आधार",
    pending: "हिंदी अनुवाद की स्कूल द्वारा समीक्षा बाकी",
    ai: "सत्यापित उत्तर से AI द्वारा पुनः लिखा गया",
    leave: "पूछताछ दर्ज करें",
  },
};

export function AdmissionsAssistant() {
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = T[lang];
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(text: string) {
    if (text.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setMsgs((m) => [...m, { from: "user", text }]);
    setQ("");
    try {
      const reply = await api<Reply>("POST", "/api/assistant", { question: text, lang });
      setMsgs((m) => [...m, { from: "bot", reply }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col min-h-[30rem]" aria-labelledby="assistant-h" lang={lang}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-line">
        <h2 id="assistant-h" className="font-bold">{t.title}</h2>
        <div className="flex gap-1" role="group" aria-label="Language">
          <button type="button" className={`btn btn-sm ${lang === "en" ? "btn-primary" : "btn-secondary"}`} aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
          <button type="button" className={`btn btn-sm ${lang === "hi" ? "btn-primary" : "btn-secondary"}`} aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</button>
        </div>
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[32rem]" aria-live="polite">
        {!msgs.length && (
          <div className="flex flex-wrap gap-2">
            {t.chips.map((c) => (
              <button key={c} type="button" className="badge badge-brand cursor-pointer hover:opacity-80 !text-sm !py-1 !px-3" onClick={() => ask(c)}>{c}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand text-white px-4 py-2 text-sm">{m.text}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              <div className={`rounded-2xl rounded-bl-sm px-4 py-3 text-sm ${m.reply.mode === "escalated" ? "bg-[#fab219]/12 border border-[#fab219]/40" : "bg-surface-2"}`}>
                {m.reply.mode === "escalated" && (
                  <p className="font-semibold flex items-center gap-1.5 mb-1"><UserRound className="w-4 h-4" aria-hidden /> {t.handoff}</p>
                )}
                <p className="whitespace-pre-wrap">{m.reply.answer}</p>
                {m.reply.reason && <p className="text-xs text-ink-2 mt-1.5">{m.reply.reason}</p>}
                {m.reply.mode === "escalated" && (
                  <a href="#enquiry" className="inline-block mt-2 text-xs font-semibold text-brand">{t.leave} →</a>
                )}
              </div>
              {m.reply.sources.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {m.reply.sources.map((s) => (
                    <li key={s.id} className="text-[0.72rem] text-muted flex items-start gap-1">
                      {s.verified ? <BadgeCheck className="w-3.5 h-3.5 text-good shrink-0" aria-hidden /> : <CircleAlert className="w-3.5 h-3.5 text-warn shrink-0" aria-hidden />}
                      <span>
                        {t.from}: “{s.question}”, {s.verification}
                        {s.translationPending && ` · ${t.pending}`}
                        {m.reply.mode === "ai" && ` · ${t.ai}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        <div ref={endRef} />
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
      <form
        className="border-t border-line p-3 flex gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="assistant-q" className="sr-only">{t.title}</label>
        <input id="assistant-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.placeholder} maxLength={500} />
        <button className="btn btn-primary" disabled={busy || q.trim().length < 2} aria-label={t.send}>
          <Send className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">{busy ? "…" : t.send}</span>
        </button>
      </form>
    </section>
  );
}

export function EnquiryForm({ grades, presentation }: { grades: string[]; presentation: boolean }) {
  const [ref, setRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = formToJson(e.currentTarget);
      const res = await api<{ ref: string }>("POST", "/api/enquiries", data);
      setRef(res.ref);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ref) {
    return (
      <section id="enquiry" className="card card-pad" role="status">
        <h2 className="font-bold">Enquiry received</h2>
        <p className="mt-2 text-sm">Your reference number is</p>
        <p className="text-2xl font-bold font-display tracking-wider mt-1" data-testid="enquiry-ref">{ref}</p>
        <p className="mt-2 text-sm text-ink-2">Keep this number. You can check progress below with the reference and your phone number.</p>
        {presentation && <p className="mt-2 text-xs text-muted">Presentation version: this enquiry is visible to staff accounts in this application only.</p>}
      </section>
    );
  }

  return (
    <section id="enquiry" className="card card-pad scroll-mt-4" aria-labelledby="enq-h">
      <h2 id="enq-h" className="font-bold">Leave an enquiry · पूछताछ</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label" htmlFor="e-parent">Parent / guardian name</label><input id="e-parent" name="parentName" className="input" required minLength={2} maxLength={100} autoComplete="name" /></div>
          <div><label className="label" htmlFor="e-phone">Mobile number</label><input id="e-phone" name="phone" className="input" required inputMode="tel" autoComplete="tel" pattern={String.raw`[+]?[0-9 \(\)\-]{10,16}`} /></div>
          <div><label className="label" htmlFor="e-child">Child&apos;s name</label><input id="e-child" name="childName" className="input" required minLength={2} maxLength={100} /></div>
          <div>
            <label className="label" htmlFor="e-grade">Class sought</label>
            <select id="e-grade" name="gradeSought" className="select" required>{grades.map((g) => <option key={g}>{g}</option>)}</select>
          </div>
          <div><label className="label" htmlFor="e-email">Email (optional)</label><input id="e-email" name="email" type="email" className="input" autoComplete="email" /></div>
          <div>
            <label className="label" htmlFor="e-board">Day scholar or boarding</label>
            <select id="e-board" name="boardingInterest" className="select" defaultValue="undecided">
              <option value="day">Day scholar</option><option value="boarding">Boarding</option><option value="undecided">Not decided</option>
            </select>
          </div>
        </div>
        <div><label className="label" htmlFor="e-msg">Your question (optional)</label><textarea id="e-msg" name="message" className="textarea" rows={3} maxLength={1500} /></div>
        <div className="hidden" aria-hidden="true"><label htmlFor="e-web">Website</label><input id="e-web" name="website" tabIndex={-1} autoComplete="off" /></div>
        <input type="hidden" name="language" value="en" />
        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" name="consent" required className="mt-1 accent-[#6c5ce7]" />
          <span>I agree that the admissions team may contact me about this enquiry. My details will be used only for this purpose.{presentation && " I am using sample details, not real information."}</span>
        </label>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Submit enquiry"}</button>
      </form>
    </section>
  );
}

type Tracked = { ref: string; statusLabel: string; nextStep: string; gradeSought: string; submittedAt: string; history: { status: string; at: string }[] };

export function TrackForm() {
  const [res, setRes] = useState<Tracked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card card-pad" aria-labelledby="track-h">
      <h2 id="track-h" className="font-bold">Check your enquiry</h2>
      <form
        className="mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setRes(null);
          try {
            setRes(await api<Tracked>("POST", "/api/enquiries/track", formToJson(e.currentTarget)));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div><label className="label" htmlFor="t-ref">Reference</label><input id="t-ref" name="ref" className="input uppercase" placeholder="MV-XXXXXX" required /></div>
        <div><label className="label" htmlFor="t-phone">Mobile number</label><input id="t-phone" name="phone" className="input" required inputMode="tel" /></div>
        <button className="btn btn-secondary" disabled={busy}>Check</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      {res && (
        <div className="mt-4 text-sm" role="status">
          <p><span className="text-muted">Status:</span> <strong data-testid="track-status">{res.statusLabel}</strong> · {res.gradeSought}</p>
          <p className="mt-1">{res.nextStep}</p>
          <ol className="mt-3 border-l-2 border-line pl-4 space-y-1">
            {res.history.map((h, i) => <li key={i} className="text-xs"><span className="text-muted">{fmtDate(h.at)}</span> · {h.status}</li>)}
          </ol>
        </div>
      )}
    </section>
  );
}
