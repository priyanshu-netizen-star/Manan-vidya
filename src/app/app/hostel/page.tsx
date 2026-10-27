import Link from "next/link";
import { BarList } from "@/components/charts";
import { Card, EmptyState, PageHeader, SampleDataTag, Stat, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { hostelSummary } from "@/lib/queries";
import { LEAVE_LABEL, type LeaveStatus } from "@/lib/workflows";

export const metadata = { title: "Hostel" };

export default async function HostelOverview() {
  await requireAnyPermission("hostel.view", "hostel.manage");
  const db = await getDb();
  const h = await hostelSummary();
  const blocks = await db.query<{ block: string; beds: number; occupied: number }>(
    `SELECT r.block, count(b.id)::int AS beds, count(ba.id)::int AS occupied
       FROM hostel_rooms r JOIN hostel_beds b ON b.room_id = r.id LEFT JOIN bed_allocations ba ON ba.bed_id = b.id AND ba.to_date IS NULL
      GROUP BY r.block ORDER BY r.block`,
  );
  const out = await db.query<{ id: number; name: string; kind: string; return_at: string; status: LeaveStatus }>(
    `SELECT l.id, s.name, l.kind, l.return_at, l.status FROM leave_requests l JOIN students s ON s.id = l.student_id
      WHERE l.status IN ('pending','checked_out') ORDER BY l.status DESC, l.return_at`,
  );
  const lastRc = h?.last_rollcall
    ? await db.query<{ session: string; present: number; absent: number; on_leave: number }>(
        `SELECT session, count(*) FILTER (WHERE status = 'present')::int AS present, count(*) FILTER (WHERE status = 'absent')::int AS absent,
                count(*) FILTER (WHERE status = 'on_leave')::int AS on_leave FROM hostel_attendance WHERE date = $1 GROUP BY session ORDER BY session`,
        [h.last_rollcall],
      )
    : [];
  const unallocated = await db.one<{ n: number }>(
    "SELECT count(*)::int AS n FROM students s WHERE s.is_boarder AND s.status = 'active' AND NOT EXISTS (SELECT 1 FROM bed_allocations ba WHERE ba.student_id = s.id AND ba.to_date IS NULL)",
  );
  return (
    <div>
      <PageHeader eyebrow="Hostel" title="Hostel overview" description="Who is in the hostel, who is out, and what needs attention." actions={isPresentation() ? <SampleDataTag /> : undefined} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Boarders" value={h?.boarders ?? 0} sub={unallocated?.n ? `${unallocated.n} without a bed` : "All have a bed"} tone={unallocated?.n ? "bad" : undefined} />
        <Stat label="Beds occupied" value={`${h?.occupied ?? 0} / ${h?.beds ?? 0}`} />
        <Stat label="Requests awaiting warden" value={h?.pending ?? 0} tone={h?.pending ? "bad" : undefined} />
        <Stat label="Open maintenance" value={h?.open_maintenance ?? 0} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card title="Occupancy by block">
          <BarList title="Beds occupied by block" valueLabel="Occupied" data={blocks.map((b) => ({ label: b.block, value: b.occupied, display: `${b.occupied} / ${b.beds}` }))} max={Math.max(...blocks.map((b) => b.beds), 1)} />
        </Card>
        <Card title={`Last roll-call${h?.last_rollcall ? ` · ${fmtDate(h.last_rollcall)}` : ""}`} actions={<Link href="/app/hostel/rollcall" className="text-xs font-semibold text-brand">Take roll-call</Link>}>
          {lastRc.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Session</th><th>Present</th><th>On leave</th><th>Absent</th></tr></thead>
              <tbody>{lastRc.map((r) => <tr key={r.session}><td className="capitalize">{r.session}</td><td>{r.present}</td><td>{r.on_leave}</td><td className={r.absent ? "text-bad font-semibold" : ""}>{r.absent}</td></tr>)}</tbody>
            </table></div>
          ) : <EmptyState title="No roll-call recorded yet" />}
        </Card>
        <Card title="Out now and awaiting decision" className="lg:col-span-2" pad={false} actions={<Link href="/app/hostel/leave" className="text-xs font-semibold text-brand">All requests</Link>}>
          {out.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Student</th><th>Type</th><th>Due back</th><th>Status</th></tr></thead>
              <tbody>{out.map((o) => <tr key={o.id}><td>{o.name}</td><td className="capitalize">{o.kind}</td><td>{fmtDateTime(o.return_at)}</td><td><StatusBadge status={o.status} label={LEAVE_LABEL[o.status]} /></td></tr>)}</tbody>
            </table></div>
          ) : <EmptyState title="Nobody is out and nothing is waiting" />}
        </Card>
      </div>
    </div>
  );
}
