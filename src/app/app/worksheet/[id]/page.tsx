import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { studentLevel } from "@/lib/access";
import { requirePageUser } from "@/lib/auth";
import { SCHOOL } from "@/lib/config";
import { getDb } from "@/lib/db";

export const metadata = { title: "Worksheet" };

export default async function WorksheetView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ answers?: string }> }) {
  const user = await requirePageUser("learning.use");
  const id = Number((await params).id);
  const db = await getDb();
  const w = await db.one<{ id: number; title: string; instructions: string; status: string; question_ids: number[]; class_name: string; level: number; topic: string }>(
    `SELECT w.id, w.title, w.instructions, w.status, w.question_ids, c.name AS class_name, c.level, t.name AS topic
       FROM worksheets w JOIN classes c ON c.id = w.class_id JOIN topics t ON t.id = w.topic_id WHERE w.id = $1`,
    [Number.isInteger(id) ? id : 0],
  );
  if (!w) notFound();
  if (user.role === "student" && (w.status !== "approved" || (await studentLevel(user)) !== w.level)) notFound();
  const showAnswers = user.role !== "student" && (await searchParams).answers === "1";
  const qs = await db.query<{ id: number; prompt: string; options: string[]; correct_index: number }>(
    "SELECT id, prompt, options, correct_index FROM questions WHERE id = ANY($1::int[])",
    [w.question_ids],
  );
  const ordered = w.question_ids.map((qid) => qs.find((q) => q.id === qid)).filter(Boolean) as typeof qs;
  return (
    <div className="max-w-3xl mx-auto card card-pad sm:p-10">
      <div className="flex justify-between items-start gap-4 border-b border-line pb-4 mb-6">
        <div>
          <p className="text-xs text-muted">{SCHOOL.name}</p>
          <h1 className="text-xl font-bold font-display">{w.title}</h1>
          <p className="text-sm text-ink-2">{w.class_name} · {w.topic}</p>
        </div>
        <div className="no-print flex gap-2">
          {user.role !== "student" && (
            <a href={`?answers=${showAnswers ? "0" : "1"}`} className="btn btn-secondary btn-sm">{showAnswers ? "Hide answers" : "Show answer key"}</a>
          )}
          <PrintButton />
        </div>
      </div>
      <p className="text-sm mb-1">Name: ______________________ &nbsp; Roll no.: ______ &nbsp; Date: __________</p>
      {w.instructions && <p className="text-sm text-ink-2 mb-6">{w.instructions}</p>}
      <ol className="space-y-5">
        {ordered.map((q, i) => (
          <li key={q.id}>
            <p className="font-semibold">{i + 1}. {q.prompt}</p>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-1.5 text-sm">
              {q.options.map((o, oi) => (
                <li key={oi} className={showAnswers && oi === q.correct_index ? "font-bold text-good" : ""}>({String.fromCharCode(97 + oi)}) {o}</li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      {w.status !== "approved" && <p className="mt-6 text-xs text-bad">Draft: not yet approved for students.</p>}
    </div>
  );
}
