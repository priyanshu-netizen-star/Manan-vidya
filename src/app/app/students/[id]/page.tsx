import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonForm } from "@/components/forms";
import { Badge, Card, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addDays, fmtDate, todayIST } from "@/lib/dates";
import { MASTERY_LABEL, masteryBand } from "@/lib/quiz";
import { classesList, studentTopicProgress } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { StudentFields } from "../StudentFields";

export const metadata = { title: "Student record" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("students.read");
  const id = Number((await params).id);
  const db = await getDb();
  const s = await db.one<{
    id: number; admission_no: string; name: string; class_id: number; class_name: string; level: number; roll_no: number | null; gender: string;
    date_of_birth: string | null; guardian_name: string | null; guardian_phone: string | null; is_boarder: boolean; status: string; seeded: boolean;
  }>(
    "SELECT s.*, c.name AS class_name, c.level FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1",
    [Number.isInteger(id) ? id : 0],
  );
  if (!s) notFound();
  const from = addDays(todayIST(), -30);
  const att = await db.one<{ days: number; present: number; absent: number; late: number }>(
    `SELECT count(*)::int AS days, count(*) FILTER (WHERE status = 'present')::int AS present,
            count(*) FILTER (WHERE status = 'absent')::int AS absent, count(*) FILTER (WHERE status = 'late')::int AS late
       FROM attendance WHERE student_id = $1 AND date >= $2`,
    [s.id, from],
  );
  const exams = await db.query<{ id: number; name: string; max_marks: number; status: string; total: number | null; subjects: number }>(
    `SELECT e.id, e.name, e.max_marks, e.status, sum(m.marks)::float AS total, count(m.marks)::int AS subjects
       FROM exams e LEFT JOIN marks m ON m.exam_id = e.id AND m.student_id = $1 WHERE e.class_id = $2
      GROUP BY e.id ORDER BY e.held_on DESC NULLS LAST`,
    [s.id, s.class_id],
  );
  const progress = await studentTopicProgress(s.id, s.level);
  const bed = await db.one<{ block: string; room_no: string; label: string }>(
    "SELECT r.block, r.room_no, b.label FROM bed_allocations ba JOIN hostel_beds b ON b.id = ba.bed_id JOIN hostel_rooms r ON r.id = b.room_id WHERE ba.student_id = $1 AND ba.to_date IS NULL",
    [s.id],
  );
  const pct = att && att.days ? Math.round((100 * (att.present + att.late)) / att.days) : null;
  const classes = await classesList();
  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/students" className="text-brand font-semibold">← Student records</Link></p>
      <PageHeader
        eyebrow={`${s.admission_no} · ${s.class_name}${s.roll_no ? ` · Roll ${s.roll_no}` : ""}`}
        title={s.name}
        actions={<><StatusBadge status={s.status === "active" ? "approved" : "closed"} label={s.status} />{s.is_boarder && <Badge>Boarder</Badge>}{s.seeded && <Badge tone="warn">Sample record</Badge>}</>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Attendance (30 days)" value={pct == null ? "—" : `${pct}%`} sub={att ? `${att.absent} absent · ${att.late} late of ${att.days} days` : undefined} tone={pct != null && pct < 85 ? "bad" : undefined} />
        <Stat label="Topics secure" value={`${progress.filter((p) => masteryBand(p.best_percent) === "secure").length} / ${progress.length}`} />
        <Stat label="Hostel bed" value={bed ? `${bed.room_no}-${bed.label}` : "—"} sub={bed?.block} />
        <Stat label="Guardian" value={<span className="text-base">{s.guardian_name || "—"}</span>} sub={s.guardian_phone ?? undefined} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <Card title="Examinations" pad={false}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Exam</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}<p className="text-xs text-muted">{e.status === "locked" ? "Final" : "Marks entry open"}</p></td>
                  <td>{e.subjects ? `${e.total} / ${e.max_marks * e.subjects}` : "—"}</td>
                  <td>{e.subjects > 0 && can(user.role, "reportcards.view") && <Link href={`/app/report-cards/${s.id}?exam=${e.id}`} className="text-brand text-sm font-semibold">Report card</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Card>
        <Card title="Learning progress (practice quizzes)" pad={false}>
          <div className="table-wrap"><table className="table">
            <tbody>
              {progress.map((p) => {
                const band = masteryBand(p.best_percent);
                return (
                  <tr key={p.topic_id}><td>{p.topic}<p className="text-xs text-muted">{p.subject}</p></td><td><StatusBadge status={band} label={MASTERY_LABEL[band]} /></td><td className="text-xs text-muted">{p.last_at ? fmtDate(p.last_at) : ""}</td></tr>
                );
              })}
            </tbody>
          </table></div>
        </Card>
        {can(user.role, "students.write") && (
          <Card title="Edit record" className="lg:col-span-2">
            <JsonForm endpoint={`/api/students/${s.id}`} method="PATCH" submitLabel="Save changes" successMessage="Record updated.">
              <StudentFields classes={classes} d={s} withStatus />
            </JsonForm>
          </Card>
        )}
      </div>
    </div>
  );
}
