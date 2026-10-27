import Link from "next/link";
import { CalendarCheck, ClipboardCheck, Inbox, Search, Sparkles, Building2 } from "lucide-react";
import { AskData } from "@/components/ai/AskData";
import { Briefing } from "@/components/ai/Briefing";
import { BarList, TrendChart } from "@/components/charts";
import { Card, EmptyState, PageHeader, SampleDataTag, Stat } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured, isPresentation } from "@/lib/config";
import { roleFacts } from "@/lib/insights";
import { getDb } from "@/lib/db";
import { fmtDate, todayIST } from "@/lib/dates";
import { attendanceTrend, classesList, enquiryAttention, enquiryCounts, hostelSummary, taskCounts, topicPerformance } from "@/lib/queries";
import { ENQUIRY_LABEL, ENQUIRY_STATUSES, TASK_LABEL, TASK_STATUSES } from "@/lib/workflows";

export const metadata = { title: "Command centre" };

const RANGES = [7, 14, 30] as const;

export default async function CommandCentre({ searchParams }: { searchParams: Promise<{ classId?: string; days?: string; q?: string }> }) {
  const user = await requirePageUser("command.view");
  const sp = await searchParams;
  const classes = await classesList();
  const classId = classes.some((c) => c.id === Number(sp.classId)) ? Number(sp.classId) : null;
  const days = RANGES.includes(Number(sp.days) as 7) ? Number(sp.days) : 14;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const db = await getDb();
  const today = todayIST();

  const [trend, enquiries, attention, hostel, tasks, topics] = await Promise.all([
    attendanceTrend(days, classId),
    enquiryCounts(),
    enquiryAttention(),
    hostelSummary(),
    taskCounts(),
    topicPerformance({ classId: classId ?? undefined }),
  ]);
  const overdue = await db.query<{ id: number; title: string; due_date: string; assignee: string | null }>(
    "SELECT t.id, t.title, t.due_date, u.name AS assignee FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.status <> 'done' AND t.due_date < $1 ORDER BY t.due_date LIMIT 6",
    [today],
  );
  const results = q
    ? await db.query<{ kind: string; id: number; label: string; sub: string; href: string }>(
        `(SELECT 'Student' AS kind, s.id, s.name AS label, c.name || ' · ' || s.admission_no AS sub, '/app/students/' || s.id AS href
            FROM students s JOIN classes c ON c.id = s.class_id WHERE s.name ILIKE '%' || $1 || '%' OR s.admission_no ILIKE '%' || $1 || '%' LIMIT 8)
         UNION ALL
         (SELECT 'Enquiry', e.id, e.parent_name || ' (' || e.ref_code || ')', e.grade_sought || ' · ' || e.status, '/app/enquiries/' || e.id
            FROM enquiries e WHERE e.parent_name ILIKE '%' || $1 || '%' OR e.child_name ILIKE '%' || $1 || '%' OR e.ref_code ILIKE '%' || $1 || '%' LIMIT 8)
         UNION ALL
         (SELECT 'Task', t.id, t.title, t.module || ' · ' || t.status, '/app/tasks?view=all' FROM tasks t WHERE t.title ILIKE '%' || $1 || '%' LIMIT 8)`,
        [q],
      )
    : [];

  const facts = await roleFacts(user);
  const latest = trend.at(-1);
  const avgAtt = trend.length ? Math.round(trend.reduce((n, t) => n + t.percent, 0) / trend.length) : null;
  const openTasks = tasks.filter((t) => t.status !== "done").reduce((n, t) => n + t.n, 0);
  const quizAvg = topics.filter((t) => t.avg_percent != null);
  const overallQuiz = quizAvg.length ? Math.round(quizAvg.reduce((n, t) => n + (t.avg_percent ?? 0), 0) / quizAvg.length) : null;
  const filterHref = (o: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { classId, days, q: q || null, ...o };
    for (const [k, v] of Object.entries(merged)) if (v != null && v !== "") p.set(k, String(v));
    return `/app/command?${p}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Management"
        title="Command centre"
        description="One view across admissions, attendance, learning, hostel and administration."
        actions={isPresentation() ? <SampleDataTag /> : undefined}
      />
      {isPresentation() && (
        <p className="text-xs text-muted -mt-3 mb-4">Every figure on this page is calculated from synthetic presentation records. Real figures appear only after the school authorises integration of its data.</p>
      )}
      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <Briefing facts={facts} aiEnabled={aiConfigured()} title="Executive briefing" />
        <section className="ai-card p-5">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand" aria-hidden /> Ask your data</h2>
          <p className="text-xs text-muted mb-3">Plain-English questions, answered from the school&apos;s standard reports.</p>
          <AskData />
        </section>
      </div>
      {/* Filters: one row above the charts */}
      <div className="card card-pad flex flex-wrap gap-4 items-end mb-5">
        <div>
          <p className="label">Class</p>
          <div className="flex flex-wrap gap-1">
            <Link href={filterHref({ classId: null })} className={`btn btn-sm ${classId == null ? "btn-primary" : "btn-secondary"}`}>All</Link>
            {classes.map((c) => <Link key={c.id} href={filterHref({ classId: c.id })} className={`btn btn-sm ${classId === c.id ? "btn-primary" : "btn-secondary"}`}>{c.name}</Link>)}
          </div>
        </div>
        <div>
          <p className="label">Period</p>
          <div className="flex gap-1">{RANGES.map((r) => <Link key={r} href={filterHref({ days: r })} className={`btn btn-sm ${days === r ? "btn-primary" : "btn-secondary"}`}>{r} days</Link>)}</div>
        </div>
        <form method="get" className="flex gap-2 items-end ml-auto min-w-[16rem] flex-1 max-w-md">
          {classId && <input type="hidden" name="classId" value={classId} />}
          <input type="hidden" name="days" value={days} />
          <div className="flex-1"><label className="label" htmlFor="cc-q">Search records</label><input id="cc-q" name="q" defaultValue={q} className="input" placeholder="Student, enquiry or task" /></div>
          <button className="btn btn-secondary" aria-label="Search"><Search className="w-4 h-4" aria-hidden /></button>
        </form>
      </div>

      {q && (
        <Card title={`Search results for “${q}”`} className="mb-5" pad={false}>
          {results.length ? (
            <ul className="divide-y divide-line">
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}><Link href={r.href} className="flex justify-between gap-3 px-5 py-2.5 hover:bg-surface-2"><span><span className="badge mr-2">{r.kind}</span>{r.label}</span><span className="text-xs text-muted">{r.sub}</span></Link></li>
              ))}
            </ul>
          ) : <EmptyState title="Nothing found" />}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<CalendarCheck />} tone="brand" label={`Attendance, latest day${classId ? "" : " (all classes)"}`} value={latest ? `${latest.percent}%` : "—"} sub={latest ? `${fmtDate(latest.date)} · ${days}-day average ${avgAtt}%` : undefined} />
        <Stat icon={<Inbox />} tone="warn" label="Enquiries needing action" value={(attention?.new_count ?? 0) + (attention?.due ?? 0)} sub={`${attention?.new_count ?? 0} new · ${attention?.due ?? 0} follow-ups due · ${attention?.escalated ?? 0} escalated`} />
        <Stat icon={<ClipboardCheck />} tone="good" label="Average practice-quiz score" value={overallQuiz == null ? "—" : `${overallQuiz}%`} sub={`${quizAvg.length} topics with results`} />
        <Stat icon={<Building2 />} label="Hostel" value={`${hostel?.out_now ?? 0} out · ${hostel?.pending ?? 0} pending`} sub={`${hostel?.occupied ?? 0}/${hostel?.beds ?? 0} beds · ${hostel?.open_maintenance ?? 0} repairs open`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card title={`Attendance: last ${days} school days${classId ? ` · ${classes.find((c) => c.id === classId)?.name}` : ""}`}>
          <TrendChart title="Daily attendance percentage" points={trend.map((t) => ({ x: fmtDate(t.date).replace(/ \d{4}$/, ""), y: t.percent }))} />
        </Card>
        <Card title="Admission enquiries by status" actions={<Link href="/app/enquiries" className="text-xs font-semibold text-brand">Open</Link>}>
          <BarList title="Enquiries by status" valueLabel="Enquiries" data={ENQUIRY_STATUSES.map((s) => ({ label: ENQUIRY_LABEL[s], value: enquiries.find((e) => e.status === s)?.n ?? 0 }))} />
        </Card>
        <Card title="Topics with the lowest quiz scores" actions={<Link href="/app/teacher/performance" className="text-xs font-semibold text-brand">Details</Link>}>
          <BarList title="Average quiz score by topic" valueLabel="Average" max={100} data={quizAvg.slice(0, 8).map((t) => ({ label: `${t.topic} (${t.class_name})`, value: t.avg_percent ?? 0, display: `${t.avg_percent}%` }))} empty="No quiz results for this selection." />
        </Card>
        <Card title={`Administrative tasks · ${openTasks} open`} actions={<Link href="/app/tasks?view=all" className="text-xs font-semibold text-brand">Open</Link>}>
          <BarList title="Tasks by status" valueLabel="Tasks" color="var(--chart-1)" data={TASK_STATUSES.map((s) => ({ label: TASK_LABEL[s], value: tasks.find((t) => t.status === s)?.n ?? 0 }))} />
          {overdue.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-bad mb-1.5">Overdue</p>
              <ul className="space-y-1 text-sm">{overdue.map((t) => <li key={t.id}>{t.title} <span className="text-xs text-muted">· due {fmtDate(t.due_date)} · {t.assignee ?? "unassigned"}</span></li>)}</ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
