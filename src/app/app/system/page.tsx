import { CheckCircle2, CircleDashed } from "lucide-react";
import { ActionButton } from "@/components/forms";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured, aiModel, aiProvider, appEnv, isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";

export const metadata = { title: "System & AI status" };

/** Every AI feature, the module it belongs to, and the human check that applies. Keys match audit actions "ai.<key>". */
const AI_FEATURES: [string, string, string, string][] = [
  ["copilot", "AI Copilot (every page)", "All roles", "Answers only from the user's own role-scoped data and the user guide"],
  ["briefing", "Daily briefing", "All roles", "Summary of live facts; makes no decisions"],
  ["study.chat", "Study assistant: ask anything", "Students, teachers", "Grounded in teacher-approved material; child-safety screening first"],
  ["study.simplify", "Study assistant: explain simply", "Students, teachers", "Grounded in approved material"],
  ["study.steps", "Study assistant: step by step", "Students, teachers", "Grounded in approved material"],
  ["study.notes", "Study assistant: revision notes", "Students, teachers", "Grounded in approved material"],
  ["study.flashcards", "Study assistant: flashcards", "Students, teachers", "Falls back to the approved question bank"],
  ["study.quiz", "Study assistant: quiz me", "Students, teachers", "Practice only; never marked"],
  ["explain", "Explain my mistake", "Students", "Only after the quiz is submitted"],
  ["code_help", "AI coding tutor", "Students", "Hints only; never writes the solution"],
  ["material_draft", "Learning material drafts", "Teachers", "Saved as draft; teacher must approve"],
  ["class_insights", "Class insights (misconceptions)", "Teachers, management", "Advice only; never labels students"],
  ["remark_draft", "Report-card remark drafts", "Teachers, office", "Teacher edits and approves; families see approved only"],
  ["enquiry_reply", "Admissions reply drafts", "Office, management", "Never sent automatically; fees and decisions left to staff"],
  ["ask_data", "Ask your data", "Office, management", "Routes to standard reports only; no free-form queries"],
  ["maintenance_triage", "Maintenance triage", "Warden, boarders", "Suggestion only; the person filing decides"],
];

export default async function SystemPage() {
  await requirePageUser("users.manage");
  const db = await getDb();
  const counts = await db.one<Record<string, number>>(
    `SELECT (SELECT count(*)::int FROM students WHERE seeded) AS seeded_students, (SELECT count(*)::int FROM students WHERE NOT seeded) AS other_students,
            (SELECT count(*)::int FROM users WHERE seeded AND active) AS seeded_users, (SELECT count(*)::int FROM kb_entries WHERE verification <> 'school_confirmed' AND published) AS unconfirmed_kb,
            (SELECT count(*)::int FROM kb_entries WHERE published AND answer_hi <> '' AND NOT hindi_reviewed) AS unreviewed_hindi`,
  );
  const usage = await db.query<{ action: string; ai: number; automatic: number }>(
    `SELECT action, count(*) FILTER (WHERE detail->>'mode' = 'ai')::int AS ai, count(*) FILTER (WHERE detail->>'mode' <> 'ai')::int AS automatic
       FROM audit_log WHERE action LIKE 'ai.%' AND created_at > now() - interval '30 days' GROUP BY action`,
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
              Without an AI key every AI feature switches to an automatic version built from approved material and records (for example the study assistant shows approved passages and the question bank, briefings list the live facts, remarks use a template), each labelled &quot;Automatic (not AI)&quot;. Material and question drafting report that AI is unavailable. Nothing pretends to be AI.
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
        <Card title="AI features" className="lg:col-span-2" pad={false}>
          <p className="px-5 pb-3 text-sm text-muted">Every AI feature has a non-AI fallback and labels its output &quot;AI generated&quot; or &quot;Automatic (not AI)&quot;. Usage is counted for the last 30 days; message content is never logged.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Feature</th><th>Used by</th><th>Safeguard</th><th className="text-right">AI uses</th><th className="text-right">Automatic</th></tr></thead>
              <tbody>
                {AI_FEATURES.map(([key, name, who, guard]) => {
                  const u = usage.find((x) => x.action === `ai.${key}`);
                  return (
                    <tr key={key}>
                      <td className="font-semibold">{name}</td><td className="text-sm">{who}</td><td className="text-sm text-ink-2">{guard}</td>
                      <td className="text-right tabular-nums">{u?.ai ?? 0}</td><td className="text-right tabular-nums">{u?.automatic ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
