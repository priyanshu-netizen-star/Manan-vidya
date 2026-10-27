import { RollCallGrid } from "@/components/Registers";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate, isValidDate, todayIST } from "@/lib/dates";

export const metadata = { title: "Roll-call" };

export default async function RollCallPage({ searchParams }: { searchParams: Promise<{ date?: string; session?: string }> }) {
  await requirePageUser("hostel.manage");
  const sp = await searchParams;
  const today = todayIST();
  const date = sp.date && isValidDate(sp.date) && sp.date <= today ? sp.date : today;
  const session = sp.session === "morning" ? "morning" : "night";
  const db = await getDb();
  // A student counts as on leave if an approved or checked-out request covers that date (IST).
  const students = await db.query<{ id: number; name: string; room: string | null; status: "present" | "absent" | "on_leave" | null; onLeave: boolean }>(
    `SELECT s.id, s.name, r.room_no || '-' || b.label AS room, ha.status,
            EXISTS (SELECT 1 FROM leave_requests l WHERE l.student_id = s.id AND l.status IN ('approved','checked_out')
                     AND (l.depart_at AT TIME ZONE 'Asia/Kolkata')::date <= $1::date AND (l.return_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date) AS "onLeave"
       FROM students s
       LEFT JOIN bed_allocations ba ON ba.student_id = s.id AND ba.to_date IS NULL
       LEFT JOIN hostel_beds b ON b.id = ba.bed_id LEFT JOIN hostel_rooms r ON r.id = b.room_id
       LEFT JOIN hostel_attendance ha ON ha.student_id = s.id AND ha.date = $1 AND ha.session = $2
      WHERE s.is_boarder AND s.status = 'active' ORDER BY r.block, r.room_no, b.label, s.name`,
    [date, session],
  );
  return (
    <div>
      <PageHeader eyebrow="Hostel" title="Roll-call" description="Morning and night attendance for boarders. Students with approved leave are pre-marked as on leave." />
      <form method="get" className="card card-pad flex flex-wrap gap-3 items-end mb-5">
        <div><label className="label" htmlFor="rc-date">Date</label><input id="rc-date" name="date" type="date" max={today} defaultValue={date} className="input" /></div>
        <div><label className="label" htmlFor="rc-sess">Session</label>
          <select id="rc-sess" name="session" className="select" defaultValue={session}><option value="morning">Morning</option><option value="night">Night</option></select></div>
        <button className="btn btn-secondary">Open</button>
      </form>
      <Card title={`${fmtDate(date)} · ${session} roll-call · ${students.length} boarders`}>
        {students.length ? <RollCallGrid key={`${date}-${session}`} date={date} session={session} students={students} /> : <EmptyState title="No boarders" />}
      </Card>
    </div>
  );
}
