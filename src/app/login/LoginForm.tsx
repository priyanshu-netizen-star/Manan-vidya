"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, BedDouble, BookOpenCheck, GraduationCap, Heart, Inbox, LayoutDashboard, Presentation, Settings, type LucideIcon } from "lucide-react";
import { api } from "@/components/forms";

const ROLE_STYLE: Record<string, { icon: LucideIcon; color: string; ai: string }> = {
  student: { icon: GraduationCap, color: "#a29bfe", ai: "AI study assistant · coding tutor" },
  parent: { icon: Heart, color: "#fd79a8", ai: "AI Copilot · child's progress" },
  teacher: { icon: BookOpenCheck, color: "#00cec9", ai: "AI drafts · class insights · remarks" },
  teacher2: { icon: Presentation, color: "#55efc4", ai: "AI drafts · class insights" },
  office: { icon: Inbox, color: "#fdcb6e", ai: "AI reply drafts · ask your data" },
  warden: { icon: BedDouble, color: "#74b9ff", ai: "AI hostel briefing · triage" },
  management: { icon: LayoutDashboard, color: "#e17055", ai: "Executive briefing · ask your data" },
  admin: { icon: Settings, color: "#b2bec3", ai: "AI usage · go-live checks" },
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("POST", "/api/auth/login", { email: fd.get("email"), password: fd.get("password") });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold mb-1">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-white focus:border-[#6c5ce7] outline-none" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold mb-1">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-white focus:border-[#6c5ce7] outline-none" />
      </div>
      {error && <p role="alert" className="text-sm text-[#ff8a8a]">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] py-2.5 font-semibold text-white disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function RolePicker({ accounts }: { accounts: { key: string; name: string; role: string; blurb: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <ul className="grid sm:grid-cols-2 gap-3">
        {accounts.map((a) => {
          const st = ROLE_STYLE[a.key] ?? ROLE_STYLE.admin;
          return (
          <li key={a.key}>
            <button
              type="button"
              disabled={busy !== null}
              data-account={a.key}
              onClick={async () => {
                setBusy(a.key);
                setError(null);
                try {
                  await api("POST", "/api/auth/presentation-login", { account: a.key });
                  router.push("/app");
                  router.refresh();
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(null);
                }
              }}
              className="group w-full h-full text-left vx-card vx-card-hover p-4 flex gap-3.5 disabled:opacity-60 relative overflow-hidden"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 opacity-70" style={{ background: `linear-gradient(90deg, ${st.color}, transparent)` }} aria-hidden />
              <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${st.color}1f`, border: `1px solid ${st.color}40` }}>
                <st.icon className="w-5 h-5" style={{ color: st.color }} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em]" style={{ color: st.color }}>{a.role}</span>
                <span className="flex items-center gap-1.5 font-semibold mt-0.5">{busy === a.key ? "Signing in…" : a.name}<ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" aria-hidden /></span>
                <span className="block text-xs vx-muted mt-1">{a.blurb}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[#c9c3ff]">✦ {st.ai}</span>
              </span>
            </button>
          </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-[#ff8a8a]">{error}</p>}
    </div>
  );
}
