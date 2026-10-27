import { TrendChart } from "@/components/charts";
import { AttendanceGrid } from "@/components/Registers";
import { Card, EmptyState, PageHeader, SampleDataTag } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fmtDate, isValidDate, todayIST } from "@/lib/dates";
import { attendanceTrend, classesList } from "@/lib/queries";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ classId?: string; date?: string }> }) {
  const user = await requirePageUser("attendance.mark");
  const sp = await searchParams;
  const db = await getDb();
  const classes = await classesList();
  // Teachers see only the classes they teach; office staff and administrators see all.
  const taught = user.role === "teacher"
    ? new Set((await db.query<{ class_id: number }>("SELECT DISTINCT class_id FROM teaching_assignments WHERE teacher_id = $1", [user.id])).map((r) => r.class_id))
    : null;
  const visible = taught ? classes.filter((c) => taught.has(c.id)) : classes;
  const classId = visible.find((c) => c.id === Number(sp.classId))?.id ?? visible[0]?.id;
  const today = todayIST();
  const date = sp.date && isValidDate(sp.date) && sp.date <= today ? sp.date : today;
  if (!classId) {
    return <div className="card"><EmptyState title="No classes assigned">You need a class assignment to mark attendance.</EmptyState></div>;
  }
  const students = await db.query<{ id: number; name: string; roll_no: number | null; status: "present" | "absent" | "late" | "excused" | null }>(
    `SELECT s.id, s.name, s.roll_no, a.status FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2
      WHERE s.class_id = $1 AND s.status = 'active' ORDER BY s.roll_no NULLS LAST, s.name`,
    [classId, date],
  );
  const trend = await attendanceTrend(14, classId);
  const className = visible.find((c) => c.id === classId)?.name;
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Attendance" description="Mark the daily register. Everyone starts as present; tap only the exceptions." actions={isPresentation() ? <SampleDataTag /> : undefined} />
      <form method="get" className="card card-pad flex flex-wrap gap-3 items-end mb-5">
        <div><label className="label" htmlFor="at-class">Class</label>
          <select id="at-class" name="classId" className="select" defaultValue={classId}>{visible.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="at-date">Date</label><input id="at-date" name="date" type="date" max={today} defaultValue={date} className="input" /></div>
        <button className="btn btn-secondary">Open register</button>
      </form>
      <div className="grid lg:grid-cols-[1fr_1fr] gap-5 items-start">
        <Card title={`${className} · ${fmtDate(date)}`}>
          {students.length ? <AttendanceGrid key={`${classId}-${date}`} classId={classId} date={date} students={students} /> : <EmptyState title="No active students in this class" />}
        </Card>
        <Card title={`${className}: attendance, last 14 school days`}>
          <TrendChart title={`${className} attendance percentage by day`} points={trend.map((t) => ({ x: fmtDate(t.date).replace(/ \d{4}$/, ""), y: t.percent }))} />
        </Card>
      </div>
    </div>
  );
}
