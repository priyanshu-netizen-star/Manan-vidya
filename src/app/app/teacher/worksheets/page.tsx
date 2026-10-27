import Link from "next/link";
import { ActionButton, JsonForm } from "@/components/forms";
import { Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { teachOptions } from "@/lib/queries";

export const metadata = { title: "Worksheets" };

export default async function WorksheetsPage({ searchParams }: { searchParams: Promise<{ ct?: string }> }) {
  const user = await requirePageUser("content.manage");
  const options = await teachOptions(user);
  const sp = await searchParams;
  const chosen = options.find((o) => `${o.class_id}:${o.topic_id}` === sp.ct) ?? null;
  const db = await getDb();
  const sheets = await db.query<{ id: number; title: string; status: string; class_name: string; topic: string; n: number }>(
    `SELECT w.id, w.title, w.status, c.name AS class_name, t.name AS topic, jsonb_array_length(w.question_ids)::int AS n
       FROM worksheets w JOIN classes c ON c.id = w.class_id JOIN topics t ON t.id = w.topic_id
      WHERE EXISTS (SELECT 1 FROM unnest($1::int[], $2::int[]) AS o(class_id, topic_id) WHERE o.class_id = w.class_id AND o.topic_id = w.topic_id)
      ORDER BY w.created_at DESC`,
    [options.map((o) => o.class_id), options.map((o) => o.topic_id)],
  );
  const bank = chosen
    ? await db.query<{ id: number; prompt: string; difficulty: string }>("SELECT id, prompt, difficulty FROM questions WHERE topic_id = $1 AND status = 'approved' ORDER BY id", [chosen.topic_id])
    : [];

  return (
    <div>
      <PageHeader eyebrow="Teacher workspace" title="Worksheets" description="Build printable worksheets from approved questions. Approved worksheets appear on the topic page for students." />
      <div className="grid lg:grid-cols-[1fr_26rem] gap-5 items-start">
        <Card pad={false}>
          {sheets.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Worksheet</th><th>Class</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {sheets.map((w) => (
                  <tr key={w.id}>
                    <td><Link href={`/app/worksheet/${w.id}`} className="font-semibold text-brand">{w.title}</Link><p className="text-xs text-muted">{w.topic} · {w.n} questions</p></td>
                    <td>{w.class_name}</td>
                    <td><StatusBadge status={w.status} /></td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        {w.status === "draft" && <ActionButton endpoint={`/api/worksheets/${w.id}`} method="PATCH" body={{ action: "approve" }} label="Approve" variant="primary" />}
                        {w.status !== "archived" && <ActionButton endpoint={`/api/worksheets/${w.id}`} method="PATCH" body={{ action: "archive" }} label="Archive" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <EmptyState title="No worksheets yet" />
          )}
        </Card>
        <Card title="New worksheet">
          <form method="get" className="flex gap-2 items-end mb-4">
            <Field label="1. Class and topic" htmlFor="ws-ct">
              <select id="ws-ct" name="ct" className="select" defaultValue={sp.ct}>
                {options.map((o) => <option key={`${o.class_id}:${o.topic_id}`} value={`${o.class_id}:${o.topic_id}`}>{o.class_name} · {o.topic}</option>)}
              </select>
            </Field>
            <button className="btn btn-secondary">Choose</button>
          </form>
          {chosen && (
            bank.length ? (
              <JsonForm endpoint="/api/worksheets" extra={{ classTopic: `${chosen.class_id}:${chosen.topic_id}` }} submitLabel="Save as draft" successMessage="Worksheet saved as a draft." resetOnSuccess>
                <Field label="2. Title" htmlFor="ws-title"><input id="ws-title" name="title" className="input" required defaultValue={`${chosen.topic}: worksheet`} /></Field>
                <Field label="Instructions" htmlFor="ws-ins"><input id="ws-ins" name="instructions" className="input" defaultValue="Show your working." /></Field>
                <fieldset>
                  <legend className="label">3. Questions</legend>
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                    {bank.map((q) => (
                      <li key={q.id}>
                        <label className="flex gap-2 items-start text-sm"><input type="checkbox" name="questionIds" value={q.id} data-multi defaultChecked className="mt-1 accent-[#6c5ce7]" />{q.prompt}</label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              </JsonForm>
            ) : (
              <p className="text-sm text-muted">No approved questions for this topic yet.</p>
            )
          )}
        </Card>
      </div>
    </div>
  );
}
