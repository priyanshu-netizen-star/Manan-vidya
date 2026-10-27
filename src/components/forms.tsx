"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { withBase } from "@/lib/config";

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(withBase(path), {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

/** Serialises a form to JSON. Repeated names become arrays; unchecked checkboxes become false. */
export function formToJson(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    if (k in out) out[k] = ([] as unknown[]).concat(out[k], v);
    else out[k] = v;
  }
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]').forEach((cb) => {
    if (cb.dataset.multi === undefined && !cb.checked && !(cb.name in out)) out[cb.name] = false;
    if (cb.dataset.multi === undefined && cb.checked && out[cb.name] === "on") out[cb.name] = true;
  });
  return out;
}

export function JsonForm({
  endpoint,
  method = "POST",
  children,
  className = "space-y-4",
  submitLabel = "Save",
  successMessage = "Saved.",
  resetOnSuccess = false,
  redirectTo,
  extra,
  onSuccess,
}: {
  endpoint: string;
  method?: string;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  /** Path to open on success; "{id}" is replaced with the id returned by the API. */
  redirectTo?: string;
  extra?: Record<string, unknown>;
  onSuccess?: (data: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(null);
    try {
      const data = await api<Record<string, unknown>>(method, endpoint, { ...formToJson(form), ...extra });
      setMsg({ ok: true, text: successMessage });
      if (resetOnSuccess) form.reset();
      onSuccess?.(data);
      startTransition(() => {
        if (redirectTo) router.push(redirectTo.replace("{id}", String(data.id ?? "")));
        else router.refresh();
      });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={className} noValidate={false}>
      {children}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

export function ActionButton({
  endpoint,
  method = "POST",
  body,
  label,
  confirm,
  variant = "secondary",
  size = "sm",
  redirectTo,
}: {
  endpoint: string;
  method?: string;
  body?: unknown;
  label: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""}`}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(null);
          try {
            await api(method, endpoint, body ?? {});
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-bad mt-1">
          {error}
        </span>
      )}
    </span>
  );
}
