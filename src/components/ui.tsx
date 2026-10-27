import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold font-display text-ink">{title}</h1>
        {description && <div className="mt-1 text-sm text-ink-2 max-w-3xl">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
          {title && <h2 className="text-sm font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={pad ? "card-pad" : ""}>{children}</div>
    </section>
  );
}

type Tone = "default" | "brand" | "good" | "warn" | "bad";
export function Badge({ tone = "default", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`badge ${tone === "default" ? "" : `badge-${tone}`}`} title={title}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  approved: "good", published: "good", passed: "good", done: "good", admitted: "good", returned: "good", resolved: "good", present: "good", secure: "good", school_confirmed: "good", reviewed: "good",
  draft: "warn", pending: "warn", in_progress: "warn", open: "warn", new: "brand", contacted: "brand", visit_scheduled: "brand", application_submitted: "brand", checked_out: "brand", developing: "warn", late: "warn", pending_school: "warn", public_source: "warn", on_leave: "brand", excused: "default",
  rejected: "bad", blocked: "bad", absent: "bad", needs_support: "bad", cancelled: "default", closed: "default", archived: "default", locked: "default", not_started: "default",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "default"}>{label ?? status.replace(/_/g, " ")}</Badge>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="text-sm text-muted mt-1 max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="card card-pad">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-display ${tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-ink"}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        tone === "warn" ? "border-[#fab219]/50 bg-[#fab219]/10 text-ink" : "border-brand/25 bg-brand/5 text-ink"
      }`}
      role="note"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Shown on any panel whose numbers come from synthetic presentation data. */
export function SampleDataTag() {
  return (
    <Badge tone="warn" title="Synthetic records created for the presentation. Not real school data.">
      Sample data
    </Badge>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
