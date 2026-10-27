"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/components/forms";

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
        {accounts.map((a) => (
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
              className="w-full text-left vx-card p-4 hover:border-[#6c5ce7]/60 transition-colors disabled:opacity-60"
            >
              <span className="block text-xs font-semibold uppercase tracking-wide text-[#a29bfe]">{a.role}</span>
              <span className="block font-semibold mt-0.5">{busy === a.key ? "Signing in…" : a.name}</span>
              <span className="block text-xs vx-muted mt-1">{a.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-[#ff8a8a]">{error}</p>}
    </div>
  );
}
