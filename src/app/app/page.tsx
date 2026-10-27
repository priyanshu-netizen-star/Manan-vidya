import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, Notice, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { navFor } from "@/lib/nav";
import { MASTERY_LABEL, masteryBand } from "@/lib/quiz";
import { enquiryAttention, hostelSummary, recentAttempts, studentInfo, studentTopicProgress, taskCounts } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/rbac";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePageUser();
  const { denied } = await searchParams;
  const db = await getDb();
  const groups = navFor(user.role).filter((g) => g.label !== "Overview");
  const first = user.name.split(" ")[0];

  let body: React.ReactNode = null;

  if ((user.role === "student" || user.role === "parent") && user.studentId) {
    const s = await studentInfo(user.studentId);
    const progress = s ? await studentTopicProgress(s.id, s.level) : [];
    const attempts = await recentAttempts(user.studentId, 5);
    const open = await db.query<{ id: number; title: string; topic: string }>(
      `SELECT qz.id, qz.title, t.name AS topic FROM quizzes qz JOIN topics t ON t.id = qz.topic_id
        WHERE qz.status = 'published' AND qz.class_id = $1
          AND NOT EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.quiz_id = qz.id AND a.student_id = $2)
        ORDER BY qz.published_at DESC`,
      [s?.class_id ?? 0, user.studentId],
    );
    const leaves = await db.query<{ status: string; kind: string; depart_at: string }>(
      "SELECT status, kind, depart_at FROM leave_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 3",
      [user.studentId],
    );
    const secure = progress.filter((p) => masteryBand(p.best_percent) === "secure").length;
    body = (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label={user.role === "parent" ? "Child" : "Class"} value={user.role === "parent" ? (s?.name ?? "—") : (s?.class_name ?? "—")} sub={user.role === "parent" ? s?.class_name : `Roll no. ${s?.roll_no}`} />
          <Stat label="Topics secure" value={`${secure} / ${progress.length}`} sub="Best quiz score 80% or more" />
          <Stat label="Quizzes to do" value={open.length} />
          <Stat label="Quiz attempts" value={progress.reduce((n, p) => n + p.attempts, 0)} sub={attempts[0] ? `Last on ${fmtDate(attempts[0].submitted_at)}` : undefined} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          {user.role === "student" && (
            <Card title="Quizzes waiting for you" actions={<Link href="/app/learn" className="text-xs font-semibold text-brand">All topics</Link>}>
              {open.length ? (
                <ul className="divide-y divide-line">
                  {open.slice(0, 5).map((q) => (
                    <li key={q.id} className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-sm"><span className="font-semibold">{q.topic}</span></span>
                      <Link href={`/app/quiz/${q.id}`} className="btn btn-primary btn-sm">Start</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">You have taken every published quiz. Retake any quiz from the topic page to improve.</p>
              )}
            </Card>
          )}
          <Card title="Topic progress" actions={<Link href="/app/progress" className="text-xs font-semibold text-brand">Details</Link>}>
            <ul className="divide-y divide-line">
              {progress.slice(0, 6).map((p) => {
                const band = masteryBand(p.best_percent);
                return (
                  <li key={p.topic_id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <span><span className="text-muted">{p.subject} · </span>{p.topic}</span>
                    <StatusBadge status={band} label={`${MASTERY_LABEL[band]}${p.best_percent != null ? ` · ${p.best_percent}%` : ""}`} />
                  </li>
                );
              })}
            </ul>
          </Card>
          {user.role === "parent" && (
            <Card title="Hostel requests" actions={<Link href="/app/hostel/leave" className="text-xs font-semibold text-brand">Request leave</Link>}>
              {leaves.length ? (
                <ul className="divide-y divide-line">
                  {leaves.map((l, i) => (
                    <li key={i} className="py-2 flex justify-between text-sm">
                      <span className="capitalize">{l.kind} from {fmtDate(l.depart_at)}</span>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No requests yet.</p>
              )}
            </Card>
          )}
        </div>
      </>
    );
  } else if (user.role === "teacher") {
    const counts = await db.one<{ drafts: number; questions: number; published: number; classes: number }>(
      `SELECT (SELECT count(*)::int FROM materials WHERE status = 'draft') AS drafts,
              (SELECT count(*)::int FROM questions WHERE status = 'draft') AS questions,
              (SELECT count(*)::int FROM quizzes WHERE status = 'published' AND created_by = $1) AS published,
              (SELECT count(DISTINCT class_id)::int FROM teaching_assignments WHERE teacher_id = $1) AS classes`,
      [user.id],
    );
    body = (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="My classes" value={counts?.classes ?? 0} />
        <Stat label="My published quizzes" value={counts?.published ?? 0} />
        <Stat label="Material awaiting approval" value={counts?.drafts ?? 0} tone={counts?.drafts ? "bad" : undefined} />
        <Stat label="Questions awaiting review" value={counts?.questions ?? 0} tone={counts?.questions ? "bad" : undefined} />
      </div>
    );
  } else if (user.role === "office_admin" || user.role === "management") {
    const e = await enquiryAttention();
    const t = await taskCounts(user.role === "office_admin" ? user.id : undefined);
    const open = t.filter((x) => x.status !== "done").reduce((n, x) => n + x.n, 0);
    body = (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="New enquiries" value={e?.new_count ?? 0} />
        <Stat label="Follow-ups due" value={e?.due ?? 0} tone={e?.due ? "bad" : undefined} />
        <Stat label="Escalated to staff" value={e?.escalated ?? 0} />
        <Stat label={user.role === "office_admin" ? "My open tasks" : "Open tasks"} value={open} />
      </div>
    );
  } else if (user.role === "warden") {
    const h = await hostelSummary();
    body = (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Boarders" value={h?.boarders ?? 0} />
        <Stat label="Requests to decide" value={h?.pending ?? 0} tone={h?.pending ? "bad" : undefined} />
        <Stat label="Out on leave now" value={h?.out_now ?? 0} />
        <Stat label="Open maintenance" value={h?.open_maintenance ?? 0} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow={ROLE_LABELS[user.role]} title={`Welcome, ${first}`} description="Here is what needs your attention today." />
      {denied && (
        <div className="mb-5">
          <Notice tone="warn">That page is not available for your role. Ask the school administrator if you need access.</Notice>
        </div>
      )}
      {body}
      <h2 className="mt-8 mb-3 text-sm font-bold text-ink">Go to</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.flatMap((g) =>
          g.items.map((i) => (
            <Link key={i.href} href={i.href} className="card card-pad flex items-center justify-between hover:border-brand/40 group">
              <span>
                <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-muted">{g.label}</span>
                <span className="font-semibold text-ink">{i.label}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand" aria-hidden />
            </Link>
          )),
        )}
      </div>
    </div>
  );
}
