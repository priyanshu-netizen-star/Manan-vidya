import Link from "next/link";
import { ActionButton, JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { classesList } from "@/lib/queries";
import { can } from "@/lib/rbac";

export const metadata = { title: "Exams & marks" };

export default async function ExamsPage() {
  const user = await requireAnyPermission("marks.enter", "exams.manage");
  const db = await getDb();
  const classes = await classesList();
  const exams = await db.query<{ id: number; name: string; class_name: string; held_on: string | null; max_marks: number; status: string; entered: number; subjects: number }>(
    `SELECT e.id, e.name, c.name AS class_name, e.held_on, e.max_marks, e.status,
            (SELECT count(*)::int FROM marks m WHERE m.exam_id = e.id AND m.marks IS NOT NULL) AS entered,
            (SELECT count(DISTINCT m.subject_id)::int FROM marks m WHERE m.exam_id = e.id AND m.marks IS NOT NULL) AS subjects
       FROM exams e JOIN classes c ON c.id = e.class_id ORDER BY e.held_on DESC NULLS LAST, c.level`,
  );
  const manage = can(user.role, "exams.manage");
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Exams and marks" description="Teachers enter marks for their subjects. The office locks an exam when marks are final, which fixes the report cards." />
      <div className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <Card pad={false}>
          {exams.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Exam</th><th>Class</th><th>Date</th><th>Marks entered</th><th>Status</th>{manage && <th></th>}</tr></thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id}>
                      <td><Link href={`/app/exams/${e.id}`} className="font-semibold text-brand">{e.name}</Link><p className="text-xs text-muted">Out of {e.max_marks} per subject</p></td>
                      <td>{e.class_name}</td>
                      <td>{fmtDate(e.held_on)}</td>
                      <td>{e.entered ? `${e.entered} in ${e.subjects} subject${e.subjects === 1 ? "" : "s"}` : "None yet"}</td>
                      <td><StatusBadge status={e.status === "locked" ? "locked" : "open"} label={e.status === "locked" ? "Locked (final)" : "Open for entry"} /></td>
                      {manage && (
                        <td>
                          {e.status === "open"
                            ? <ActionButton endpoint={`/api/exams/${e.id}`} method="PATCH" body={{ action: "lock" }} label="Lock" confirm="Lock this exam? Marks can no longer be changed and report cards become final." />
                            : <ActionButton endpoint={`/api/exams/${e.id}`} method="PATCH" body={{ action: "unlock" }} label="Unlock" confirm="Unlock this exam so marks can be corrected? This is recorded in the audit log." />}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No exams yet" />
          )}
        </Card>
        {manage && (
          <Card title="Create an exam">
            <JsonForm endpoint="/api/exams" submitLabel="Create exam" successMessage="Exam created." resetOnSuccess>
              <Field label="Name" htmlFor="ex-name"><input id="ex-name" name="name" className="input" required placeholder="e.g. Periodic Test 2" /></Field>
              <Field label="Class" htmlFor="ex-class"><select id="ex-class" name="classId" className="select">{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" htmlFor="ex-date"><input id="ex-date" name="heldOn" type="date" className="input" /></Field>
                <Field label="Max marks" htmlFor="ex-max"><input id="ex-max" name="maxMarks" type="number" min={5} max={200} defaultValue={100} className="input" /></Field>
              </div>
            </JsonForm>
          </Card>
        )}
      </div>
    </div>
  );
}
