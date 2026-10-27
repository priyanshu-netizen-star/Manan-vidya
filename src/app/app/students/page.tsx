import Link from "next/link";
import { JsonForm } from "@/components/forms";
import { Badge, Card, EmptyState, Notice, PageHeader, SampleDataTag } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { addDays, todayIST } from "@/lib/dates";
import { classesList } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { StudentFields } from "./StudentFields";

export const metadata = { title: "Student records" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string; status?: string }> }) {
  const user = await requirePageUser("students.read");
  const sp = await searchParams;
  const classes = await classesList();
  const classId = classes.some((c) => c.id === Number(sp.classId)) ? Number(sp.classId) : null;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = ["active", "inactive", "alumni"].includes(sp.status ?? "") ? sp.status! : "active";
  const db = await getDb();
  const rows = await db.query<{ id: number; admission_no: string; name: string; class_name: string; roll_no: number; gender: string; is_boarder: boolean; att: number | null; seeded: boolean }>(
    `SELECT s.id, s.admission_no, s.name, c.name AS class_name, s.roll_no, s.gender, s.is_boarder, s.seeded,
            (SELECT round(100.0 * count(*) FILTER (WHERE a.status IN ('present','late')) / NULLIF(count(*),0))::int FROM attendance a WHERE a.student_id = s.id AND a.date >= $4) AS att
       FROM students s JOIN classes c ON c.id = s.class_id
      WHERE s.status = $3 AND ($1::int IS NULL OR s.class_id = $1)
        AND ($2 = '' OR s.name ILIKE '%' || $2 || '%' OR s.admission_no ILIKE '%' || $2 || '%')
      ORDER BY c.level, s.roll_no NULLS LAST, s.name LIMIT 500`,
    [classId, q, status, addDays(todayIST(), -30)],
  );
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Student records" description={`${rows.length} ${status} student${rows.length === 1 ? "" : "s"} shown.`} actions={isPresentation() ? <SampleDataTag /> : undefined} />
      <form method="get" className="card card-pad flex flex-wrap gap-3 items-end mb-5">
        <div><label className="label" htmlFor="st-class">Class</label>
          <select id="st-class" name="classId" className="select" defaultValue={classId ?? ""}><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="st-status">Status</label>
          <select id="st-status" name="status" className="select" defaultValue={status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="alumni">Alumni</option></select></div>
        <div className="flex-1 min-w-[12rem]"><label className="label" htmlFor="st-q">Search</label><input id="st-q" name="q" defaultValue={q} className="input" placeholder="Name or admission number" /></div>
        <button className="btn btn-secondary">Show</button>
      </form>
      <div className="grid xl:grid-cols-[1fr_24rem] gap-5 items-start">
        <Card pad={false}>
          {rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Admission no.</th><th>Name</th><th>Class</th><th>Roll</th><th>Attendance (30 days)</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.admission_no}</td>
                      <td><Link href={`/app/students/${r.id}`} className="font-semibold text-brand">{r.name}</Link></td>
                      <td>{r.class_name}</td>
                      <td>{r.roll_no ?? "—"}</td>
                      <td className={r.att != null && r.att < 85 ? "text-bad font-semibold" : ""}>{r.att == null ? "—" : `${r.att}%`}</td>
                      <td>{r.is_boarder && <Badge>Boarder</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No students match" />
          )}
        </Card>
        {can(user.role, "students.write") && (
          <Card title="Add a student">
            {isPresentation() && <div className="mb-3"><Notice tone="warn">Presentation environment: add sample students only, never real children&apos;s details.</Notice></div>}
            <JsonForm endpoint="/api/students" submitLabel="Add student" redirectTo="/app/students/{id}">
              <StudentFields classes={classes} />
            </JsonForm>
          </Card>
        )}
      </div>
    </div>
  );
}
