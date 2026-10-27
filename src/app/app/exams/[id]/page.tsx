import Link from "next/link";
import { notFound } from "next/navigation";
import { MarksGrid } from "@/components/Registers";
import { Card, EmptyState, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { can } from "@/lib/rbac";

export const metadata = { title: "Marks entry" };

export default async function ExamDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ subjectId?: string }> }) {
  const user = await requireAnyPermission("marks.enter", "exams.manage");
  const id = Number((await params).id);
  const db = await getDb();
  const exam = await db.one<{ id: number; name: string; class_id: number; class_name: string; held_on: string | null; max_marks: number; status: string }>(
    "SELECT e.id, e.name, e.class_id, c.name AS class_name, e.held_on, e.max_marks, e.status FROM exams e JOIN classes c ON c.id = e.class_id WHERE e.id = $1",
    [Number.isInteger(id) ? id : 0],
  );
  if (!exam) notFound();
  const subjects = await db.query<{ id: number; name: string; entered: number }>(
    `SELECT s.id, s.name, (SELECT count(*)::int FROM marks m WHERE m.exam_id = $1 AND m.subject_id = s.id AND m.marks IS NOT NULL) AS entered
       FROM subjects s
      WHERE EXISTS (SELECT 1 FROM teaching_assignments ta WHERE ta.class_id = $2 AND ta.subject_id = s.id AND ($3::int IS NULL OR ta.teacher_id = $3))
      ORDER BY s.name`,
    [exam.id, exam.class_id, user.role === "teacher" ? user.id : null],
  );
  const sp = await searchParams;
  const subject = subjects.find((s) => s.id === Number(sp.subjectId)) ?? subjects[0];
  const students = subject
    ? await db.query<{ id: number; name: string; roll_no: number | null; marks: number | null }>(
        `SELECT s.id, s.name, s.roll_no, m.marks FROM students s LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = $1 AND m.subject_id = $3
          WHERE s.class_id = $2 AND s.status = 'active' ORDER BY s.roll_no NULLS LAST, s.name`,
        [exam.id, exam.class_id, subject.id],
      )
    : [];
  const canEnter = can(user.role, "marks.enter");
  return (
    <div>
      <p className="text-sm mb-2"><Link href="/app/exams" className="text-brand font-semibold">← Exams</Link></p>
      <PageHeader
        eyebrow={`${exam.class_name} · ${fmtDate(exam.held_on)} · out of ${exam.max_marks}`}
        title={exam.name}
        actions={<StatusBadge status={exam.status === "locked" ? "locked" : "open"} label={exam.status === "locked" ? "Locked (final)" : "Open for entry"} />}
      />
      {exam.status === "locked" && <div className="mb-4"><Notice>This exam is locked. Marks are shown read-only. The office can unlock it if a correction is needed.</Notice></div>}
      {!subjects.length ? (
        <div className="card"><EmptyState title="No subjects for you in this class" /></div>
      ) : (
        <div className="grid lg:grid-cols-[16rem_1fr] gap-5 items-start">
          <Card title="Subjects" pad={false}>
            <ul className="p-2">
              {subjects.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/exams/${exam.id}?subjectId=${s.id}`} aria-current={s.id === subject?.id ? "page" : undefined} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${s.id === subject?.id ? "bg-brand/10 text-brand font-semibold" : "hover:bg-surface-2"}`}>
                    <span>{s.name}</span><span className="text-xs text-muted">{s.entered}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`${subject!.name}: ${subject!.entered} of ${students.length} entered`}>
            <MarksGrid key={subject!.id} examId={exam.id} subjectId={subject!.id} maxMarks={exam.max_marks} locked={exam.status === "locked" || !canEnter} students={students} />
          </Card>
        </div>
      )}
    </div>
  );
}
