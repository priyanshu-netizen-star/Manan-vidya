import { CheckCircle2, CircleDashed } from "lucide-react";
import { ActionButton } from "@/components/forms";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured, aiModel, aiProvider, appEnv, isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";

export const metadata = { title: "System & AI status" };

export default async function SystemPage() {
  await requirePageUser("users.manage");
  const db = await getDb();
  const counts = await db.one<Record<string, number>>(
    `SELECT (SELECT count(*)::int FROM students WHERE seeded) AS seeded_students, (SELECT count(*)::int FROM students WHERE NOT seeded) AS other_students,
            (SELECT count(*)::int FROM users WHERE seeded AND active) AS seeded_users, (SELECT count(*)::int FROM kb_entries WHERE verification <> 'school_confirmed' AND published) AS unconfirmed_kb,
            (SELECT count(*)::int FROM kb_entries WHERE published AND answer_hi <> '' AND NOT hindi_reviewed) AS unreviewed_hindi`,
  );
  const checks: [boolean, string][] = [
    [appEnv() === "production", "APP_ENV=production (disables one-click sign-in, the reset action and the presentation banner)"],
    [db.driver === "pg", "Hosted PostgreSQL configured with DATABASE_URL (embedded database is for local use only)"],
    [!!process.env.ALLOWED_ORIGINS, "ALLOWED_ORIGINS set to the public domain(s) that proxy this application"],
    [(counts?.seeded_users ?? 0) === 0, "Sample accounts removed or deactivated"],
    [(counts?.seeded_students ?? 0) === 0, "Sample student records removed before any real data is loaded"],
    [(counts?.unconfirmed_kb ?? 0) === 0, "Every published admissions answer confirmed by the school"],
    [(counts?.unreviewed_hindi ?? 0) === 0, "Every published Hindi answer reviewed by a fluent staff member"],
    [aiConfigured(), "AI service key configured (optional: only if the school approves AI features and their usage costs)"],
  ];
  return (
    <div>
      <PageHeader eyebrow="Platform" title="System and AI status" />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Configuration">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Environment</dt><dd className="font-semibold">{appEnv()}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Database</dt><dd className="font-semibold">{db.driver === "pg" ? "PostgreSQL (hosted)" : "Embedded PostgreSQL (PGlite)"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">AI service</dt><dd className="font-semibold">{aiConfigured() ? `Configured · ${aiProvider() === "gemini" ? "Google Gemini" : "Anthropic Claude"} · ${aiModel()}` : "Not configured"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">AI hourly limit per user</dt><dd className="font-semibold">{process.env.AI_HOURLY_LIMIT_PER_USER || 30}</dd></div>
          </dl>
          {aiConfigured() && aiProvider() === "gemini" && (
            <p className="mt-4 text-sm text-ink-2">
              If this Gemini key is on Google&apos;s free tier, Google&apos;s terms may allow it to use requests to improve its products, and daily limits apply. Use it with sample data only; move to a paid plan before any real student or parent information is processed.
            </p>
          )}
          {!aiConfigured() && (
            <p className="mt-4 text-sm text-ink-2">
              Without an AI key the learning assistant shows matching approved material, lesson preparation builds a template, the admissions assistant answers with the verified text, and AI question drafting reports that it is unavailable. Nothing pretends to be AI.
            </p>
          )}
        </Card>
        <Card title="Go-live readiness">
          <ul className="space-y-2 text-sm">
            {checks.map(([okay, label]) => (
              <li key={label} className="flex gap-2">
                {okay ? <CheckCircle2 className="w-4 h-4 text-good shrink-0 mt-0.5" aria-label="Done" /> : <CircleDashed className="w-4 h-4 text-warn shrink-0 mt-0.5" aria-label="Not done" />}
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="hint mt-3">The full checklist is in the deployment guide (docs/15) and the outstanding requirements list (docs/18).</p>
        </Card>
        {isPresentation() && (
          <Card title="Presentation data" className="lg:col-span-2">
            <Notice tone="warn">Resetting deletes everything in this environment and reloads the original synthetic records. Everyone is signed out.</Notice>
            <div className="mt-4"><ActionButton endpoint="/api/system/reset" label="Reset presentation data" variant="danger" size="md" confirm="Delete all data in this presentation environment and reload the sample records?" redirectTo="/login" /></div>
          </Card>
        )}
      </div>
    </div>
  );
}
