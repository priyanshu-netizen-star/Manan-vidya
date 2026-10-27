import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";

export const metadata = { title: "Report cards" };

export default async function ReportCardsPage({ searchParams }: { searchParams: Promise<{ examId?: string }> }) {
  const user = await requirePageUser("reportcards.view");
  const db = await getDb();

  // Parents see only their own child's finalised (locked) report cards.
  if (user.role === "parent" || user.role === "student") {
    const exams = user.studentId
      ? await db.query<{ id: number; name: string; held_on: string | null }>(
          `SELECT e.id, e.name, e.held_on FROM exams e JOIN students s ON s.class_id = e.class_id
            WHERE s.id = $1 AND e.status = 'locked' ORDER BY e.held_on DESC NULLS LAST`,
          [user.studentId],
        )
      : [];
    return (
      <div>
        <PageHeader title="Report cards" description="Report cards appear here once the school has finalised the exam." />
        <Card pad={false}>
          {exams.length ? (
            <ul className="divide-y divide-line">
              {exams.map((e) => (
                <li key={e.id} className="flex justify-between items-center px-5 py-3">
                  <span>{e.name}<span className="text-xs text-muted ml-2">{fmtDate(e.held_on)}</span></span>
                  <Link href={`/app/report-cards/${user.studentId}?exam=${e.id}`} className="btn btn-secondary btn-sm">View</Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No report cards yet" />
          )}
        </Card>
      </div>
    );
  }

  const exams = await db.query<{ id: number; name: string; class_name: string; status: string }>(
    "SELECT e.id, e.name, c.name AS class_name, e.status FROM exams e JOIN classes c ON c.id = e.class_id ORDER BY c.level, e.held_on DESC NULLS LAST",
  );
  const sp = await searchParams;
  const exam = exams.find((e) => e.id === Number(sp.examId)) ?? exams[0];
  const students = exam
    ? await db.query<{ id: number; name: string; roll_no: number | null }>(
        "SELECT s.id, s.name, s.roll_no FROM students s JOIN exams e ON e.class_id = s.class_id WHERE e.id = $1 AND s.status = 'active' ORDER BY s.roll_no",
        [exam.id],
      )
    : [];
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Report cards" description="Open a student's report card to view or print it. Open exams show provisional marks." />
      <form method="get" className="card card-pad flex gap-3 items-end mb-5">
        <div><label className="label" htmlFor="rc-exam">Exam</label>
          <select id="rc-exam" name="examId" className="select" defaultValue={exam?.id}>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.class_name} · {e.name}{e.status === "open" ? " (provisional)" : ""}</option>)}
          </select></div>
        <button className="btn btn-secondary">Show students</button>
      </form>
      <Card pad={false}>
        {students.length ? (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line">
            {students.map((s) => (
              <li key={s.id} className="bg-surface">
                <Link href={`/app/report-cards/${s.id}?exam=${exam!.id}`} className="flex justify-between px-4 py-3 hover:bg-surface-2">
                  <span><span className="text-muted mr-2">{s.roll_no}</span>{s.name}</span>
                  <span className="text-brand text-sm font-semibold">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No students for this exam" />
        )}
      </Card>
    </div>
  );
}
