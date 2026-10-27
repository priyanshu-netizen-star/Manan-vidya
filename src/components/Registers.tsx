"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./forms";

type Status = "present" | "absent" | "late" | "excused";
const LABEL: Record<Status, string> = { present: "P", absent: "A", late: "L", excused: "E" };
const FULL: Record<Status, string> = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };

/** Class attendance register. Everyone starts as present; staff change only the exceptions. */
export function AttendanceGrid({ classId, date, students }: { classId: number; date: string; students: { id: number; name: string; roll_no: number | null; status: Status | null }[] }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<number, Status>>(() => Object.fromEntries(students.map((s) => [s.id, s.status ?? "present"])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const already = students.some((s) => s.status);
  const counts = Object.values(marks).reduce((c, s) => ({ ...c, [s]: (c[s] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <span>{already ? "Register already saved for this date; changes will update it." : "Not yet marked for this date."}</span>
        <span className="text-muted">P {counts.present ?? 0} · A {counts.absent ?? 0} · L {counts.late ?? 0} · E {counts.excused ?? 0}</span>
      </div>
      <ul className="divide-y divide-line">
        {students.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm"><span className="text-muted w-7 inline-block">{s.roll_no}</span>{s.name}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
              {(Object.keys(LABEL) as Status[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={marks[s.id] === st}
                  title={FULL[st]}
                  aria-label={FULL[st]}
                  onClick={() => setMarks({ ...marks, [s.id]: st })}
                  className={`w-9 h-8 rounded-md text-xs font-bold border ${
                    marks[s.id] === st
                      ? st === "present" ? "bg-good text-white border-good" : st === "absent" ? "bg-bad text-white border-bad" : "bg-brand text-white border-brand"
                      : "border-line text-ink-2"
                  }`}
                >
                  {LABEL[st]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              await api("POST", "/api/attendance", { classId, date, entries: students.map((s) => ({ studentId: s.id, status: marks[s.id] })) });
              setMsg({ ok: true, text: "Register saved." });
              router.refresh();
            } catch (e) {
              setMsg({ ok: false, text: (e as Error).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save register"}
        </button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

/** Marks entry for one subject of one exam. Blank means "not entered". */
export function MarksGrid({ examId, subjectId, maxMarks, locked, students }: { examId: number; subjectId: number; maxMarks: number; locked: boolean; students: { id: number; name: string; roll_no: number | null; marks: number | null }[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<number, string>>(() => Object.fromEntries(students.map((s) => [s.id, s.marks == null ? "" : String(s.marks)])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const invalid = students.filter((s) => {
    const v = vals[s.id];
    if (v === "") return false;
    const n = Number(v);
    return Number.isNaN(n) || n < 0 || n > maxMarks;
  });

  return (
    <div>
      <ul className="divide-y divide-line">
        {students.map((s) => {
          const bad = invalid.some((i) => i.id === s.id);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
              <label htmlFor={`mk-${s.id}`} className="text-sm"><span className="text-muted w-7 inline-block">{s.roll_no}</span>{s.name}</label>
              <span className="flex items-center gap-1.5">
                <input
                  id={`mk-${s.id}`}
                  className={`input w-20 text-right ${bad ? "!border-bad" : ""}`}
                  inputMode="decimal"
                  disabled={locked}
                  value={vals[s.id]}
                  onChange={(e) => setVals({ ...vals, [s.id]: e.target.value.trim() })}
                  aria-invalid={bad}
                />
                <span className="text-xs text-muted w-10">/ {maxMarks}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {!locked && (
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || invalid.length > 0}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await api("POST", `/api/exams/${examId}/marks`, {
                  subjectId,
                  entries: students.map((s) => ({ studentId: s.id, marks: vals[s.id] === "" ? null : Number(vals[s.id]) })),
                });
                setMsg({ ok: true, text: "Marks saved." });
                router.refresh();
              } catch (e) {
                setMsg({ ok: false, text: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save marks"}
          </button>
          {invalid.length > 0 && <span role="alert" className="text-sm text-bad">{invalid.length} value(s) must be between 0 and {maxMarks}.</span>}
          {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}

type RcStatus = "present" | "absent" | "on_leave";
const RC_LABEL: Record<RcStatus, string> = { present: "Present", absent: "Absent", on_leave: "On leave" };

/** Hostel roll-call. Students on approved/checked-out leave are pre-filled as "on leave". */
export function RollCallGrid({ date, session, students }: { date: string; session: "morning" | "night"; students: { id: number; name: string; room: string | null; status: RcStatus | null; onLeave: boolean }[] }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<number, RcStatus>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.status ?? (s.onLeave ? "on_leave" : "present")])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const absent = Object.values(marks).filter((m) => m === "absent").length;
  return (
    <div>
      <ul className="divide-y divide-line">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-sm">{s.name}<span className="text-xs text-muted ml-2">{s.room ?? "no bed"}</span>{s.onLeave && <span className="badge badge-brand ml-2">leave approved</span>}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={`Roll-call for ${s.name}`}>
              {(Object.keys(RC_LABEL) as RcStatus[]).map((st) => (
                <button key={st} type="button" role="radio" aria-checked={marks[s.id] === st} onClick={() => setMarks({ ...marks, [s.id]: st })}
                  className={`px-2.5 h-8 rounded-md text-xs font-semibold border ${marks[s.id] === st ? (st === "absent" ? "bg-bad text-white border-bad" : st === "present" ? "bg-good text-white border-good" : "bg-brand text-white border-brand") : "border-line text-ink-2"}`}>
                  {RC_LABEL[st]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => {
          setBusy(true); setMsg(null);
          try {
            await api("POST", "/api/hostel/rollcall", { date, session, entries: students.map((s) => ({ studentId: s.id, status: marks[s.id] })) });
            setMsg({ ok: true, text: absent ? `Saved. ${absent} student(s) absent: follow the school's missing-student procedure.` : "Saved. Everyone accounted for." });
            router.refresh();
          } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
        }}>{busy ? "Saving…" : "Save roll-call"}</button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? (absent ? "text-bad" : "text-good") : "text-bad"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
