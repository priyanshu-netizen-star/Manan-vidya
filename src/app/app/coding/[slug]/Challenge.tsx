"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Play, RotateCcw, XCircle } from "lucide-react";
import { api } from "@/components/forms";
import { findGoal, runRobot, type RobotSpec, type RobotState } from "@/lib/robot";

export type ChallengeData = { slug: string; title: string; kind: "python" | "javascript" | "html" | "robot" | "mcq"; prompt: string; starter: string; spec: unknown; hint: string; status: string | null };
type Line = { pass: boolean; text: string };

// ─── Runners (student code only ever runs in the student's own browser) ──────────────

const JS_WORKER = `
self.onmessage = (e) => {
  const { code, fn, tests } = e.data;
  const logs = [];
  console.log = (...a) => logs.push(a.map(String).join(" "));
  try {
    const f = new Function(code + "\\n;return typeof " + fn + " === 'function' ? " + fn + " : undefined;")();
    if (!f) throw new Error("Define a function called " + fn);
    const results = tests.map((t) => {
      try { const got = f(...t.args); return { args: t.args, expected: t.expected, got, pass: JSON.stringify(got) === JSON.stringify(t.expected) }; }
      catch (err) { return { args: t.args, expected: t.expected, error: String(err && err.message || err), pass: false }; }
    });
    postMessage({ results, logs });
  } catch (err) { postMessage({ error: String(err && err.message || err), logs }); }
};`;

function runInWorker<T>(source: string, message: unknown, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const w = new Worker(url);
    const timer = setTimeout(() => { w.terminate(); URL.revokeObjectURL(url); reject(new Error("Your code took too long. Check for a loop that never ends.")); }, timeoutMs);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(e.data as T); };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); reject(new Error(e.message || "Your code could not run.")); };
    w.postMessage(message);
  });
}

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
const PY_WORKER = `
importScripts("${PYODIDE}pyodide.js");
let ready = loadPyodide({ indexURL: "${PYODIDE}" });
self.onmessage = async (e) => {
  const { code, tests } = e.data;
  const out = [];
  try {
    const py = await ready;
    py.setStdout({ batched: (s) => out.push(s) });
    py.setStderr({ batched: (s) => out.push(s) });
    const ns = py.globals.get("dict")();
    await py.runPythonAsync(code, { globals: ns });
    const results = (tests || []).map((t) => {
      try { const got = py.runPython("repr(" + t.call + ")", { globals: ns }); return { call: t.call, expected: t.expected, got, pass: got === t.expected }; }
      catch (err) { return { call: t.call, expected: t.expected, error: String(err.message || err).split("\\n").filter(Boolean).pop(), pass: false }; }
    });
    postMessage({ stdout: out.join("\\n"), results });
  } catch (err) {
    postMessage({ stdout: out.join("\\n"), error: String(err.message || err).split("\\n").filter(Boolean).slice(-1)[0] });
  }
};`;

async function runChallenge(c: ChallengeData, code: string): Promise<{ lines: Line[]; output?: string; passed: boolean }> {
  if (c.kind === "javascript") {
    const spec = c.spec as { fn: string; tests: { args: unknown[]; expected: unknown }[] };
    const r = await runInWorker<{ results?: { args: unknown[]; expected: unknown; got?: unknown; error?: string; pass: boolean }[]; error?: string; logs: string[] }>(
      JS_WORKER, { code, fn: spec.fn, tests: spec.tests }, 3000,
    );
    if (r.error) return { lines: [{ pass: false, text: r.error }], output: r.logs.join("\n"), passed: false };
    const lines = r.results!.map((t) => ({
      pass: t.pass,
      text: `${spec.fn}(${t.args.map((a) => JSON.stringify(a)).join(", ")}) should be ${JSON.stringify(t.expected)}${t.pass ? "" : t.error ? `: error ${t.error}` : `, got ${JSON.stringify(t.got)}`}`,
    }));
    return { lines, output: r.logs.join("\n"), passed: lines.every((l) => l.pass) };
  }
  if (c.kind === "python") {
    const spec = c.spec as { stdout?: string; tests?: { call: string; expected: string }[] };
    const r = await runInWorker<{ stdout: string; results?: { call: string; expected: string; got?: string; error?: string; pass: boolean }[]; error?: string }>(
      PY_WORKER, { code, tests: spec.tests ?? [] }, 45000,
    );
    if (r.error) return { lines: [{ pass: false, text: r.error }], output: r.stdout, passed: false };
    const lines: Line[] = (r.results ?? []).map((t) => ({ pass: t.pass, text: `${t.call} should be ${t.expected}${t.pass ? "" : t.error ? `: ${t.error}` : `, got ${t.got}`}` }));
    if (spec.stdout != null) {
      const ok = r.stdout.trim() === spec.stdout.trim();
      lines.push({ pass: ok, text: ok ? `Printed "${spec.stdout}"` : `Expected the output "${spec.stdout}", got "${r.stdout.trim()}"` });
    }
    return { lines, output: r.stdout, passed: lines.length > 0 && lines.every((l) => l.pass) };
  }
  if (c.kind === "html") {
    const spec = c.spec as { checks: { selector: string; min: number; label: string }[] };
    // DOMParser never executes scripts, so checking the markup is safe.
    const doc = new DOMParser().parseFromString(code, "text/html");
    const lines = spec.checks.map((ch) => {
      const els = [...doc.querySelectorAll(ch.selector)].filter((el) => (el.textContent ?? "").trim().length > 0);
      return { pass: els.length >= ch.min, text: ch.label };
    });
    return { lines, passed: lines.every((l) => l.pass) };
  }
  return { lines: [], passed: false };
}

// ─── Components ─────────────────────────────────────────────────────────────

function Result({ lines, output }: { lines: Line[]; output?: string }) {
  return (
    <div className="mt-3 space-y-1.5" aria-live="polite">
      {lines.map((l, i) => (
        <p key={i} className={`text-sm flex gap-2 ${l.pass ? "text-good" : "text-bad"}`}>
          {l.pass ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />}
          <span className="text-ink">{l.text}</span>
        </p>
      ))}
      {output ? <pre className="text-xs bg-surface-2 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">{output}</pre> : null}
    </div>
  );
}

async function saveProgress(slug: string, passed: boolean, code: string) {
  try {
    await api("POST", "/api/coding/progress", { slug, passed, code });
  } catch {
    /* progress saving is best-effort; the result is still shown */
  }
}

export function CodeChallenge({ c }: { c: ChallengeData }) {
  const [code, setCode] = useState(c.starter);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ lines: Line[]; output?: string; passed: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);
  return (
    <div>
      <label htmlFor={`code-${c.slug}`} className="label">{c.kind === "python" ? "Python" : c.kind === "html" ? "HTML" : "JavaScript"} editor</label>
      <textarea
        id={`code-${c.slug}`}
        className="textarea font-mono text-sm"
        rows={Math.max(6, code.split("\n").length + 1)}
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const t = e.currentTarget;
            const s = t.selectionStart;
            setCode(code.slice(0, s) + "    " + code.slice(t.selectionEnd));
            requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4));
          }
        }}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setRes(null);
            try {
              const r = await runChallenge(c, code);
              setRes(r);
              await saveProgress(c.slug, r.passed, code);
            } catch (e) {
              setRes({ lines: [{ pass: false, text: (e as Error).message }], passed: false });
            } finally {
              setBusy(false);
            }
          }}
        >
          <Play className="w-4 h-4" aria-hidden /> {busy ? (c.kind === "python" ? "Running (first run loads Python)…" : "Running…") : "Run and check"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => { setCode(c.starter); setRes(null); }}><RotateCcw className="w-4 h-4" aria-hidden /> Reset</button>
        <button type="button" className="btn btn-secondary" onClick={() => setShowHint(!showHint)}>{showHint ? "Hide hint" : "Hint"}</button>
      </div>
      {showHint && <p className="mt-2 text-sm rounded-lg bg-brand/5 border border-brand/20 p-2.5">{c.hint}</p>}
      {res && (
        <>
          {res.passed && <p className="mt-3 font-semibold text-good">All checks passed. Well done!</p>}
          <Result lines={res.lines} output={res.output} />
        </>
      )}
      {c.kind === "html" && (
        <div className="mt-4">
          <p className="label">Preview</p>
          {/* sandbox with no permissions: scripts and forms are disabled */}
          <iframe title="Page preview" sandbox="" srcDoc={code} className="w-full h-56 rounded-lg border border-line bg-white" />
        </div>
      )}
      {c.kind === "python" && <p className="hint mt-2">Python runs in your browser using Pyodide (loaded from cdn.jsdelivr.net). Your code is not sent to the server.</p>}
    </div>
  );
}

export function McqChallenge({ c }: { c: ChallengeData }) {
  const spec = c.spec as { questions: { q: string; options: string[] }[] };
  const [answers, setAnswers] = useState<(number | null)[]>(() => spec.questions.map(() => null));
  const [res, setRes] = useState<{ correct: number; total: number; results: boolean[]; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {spec.questions.map((q, qi) => (
        <fieldset key={qi}>
          <legend className="font-semibold text-sm mb-2">{qi + 1}. {q.q}</legend>
          <div className="space-y-1.5">
            {q.options.map((o, oi) => (
              <label key={oi} className={`flex gap-2 items-center text-sm rounded-lg border px-3 py-2 cursor-pointer ${answers[qi] === oi ? "border-brand bg-brand/5" : "border-line"}`}>
                <input type="radio" name={`${c.slug}-${qi}`} className="accent-[#6c5ce7]" checked={answers[qi] === oi} onChange={() => { const a = [...answers]; a[qi] = oi; setAnswers(a); setRes(null); }} />
                {o}
              </label>
            ))}
          </div>
          {res && <p className={`text-xs mt-1 ${res.results[qi] ? "text-good" : "text-bad"}`}>{res.results[qi] ? "Correct" : "Not quite: re-read the lesson and try again."}</p>}
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          setError(null);
          try {
            setRes(await api("POST", "/api/coding/check", { slug: c.slug, answers }));
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Check answers
      </button>
      {res && <p role="status" className={`font-semibold ${res.passed ? "text-good" : "text-ink"}`}>{res.correct} / {res.total} correct{res.passed ? ": challenge complete!" : ""}</p>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}

const ARROW: Record<RobotState["dir"], string> = { N: "▲", E: "▶", S: "▼", W: "◀" };

export function RobotChallenge({ c }: { c: ChallengeData }) {
  const spec = c.spec as RobotSpec;
  const goal = findGoal(spec.grid);
  const [code, setCode] = useState(c.starter);
  const [pos, setPos] = useState<RobotState>(spec.start);
  const [trail, setTrail] = useState<string[]>([]);
  const [msg, setMsg] = useState<Line | null>(null);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function run() {
    if (timer.current) clearInterval(timer.current);
    const result = runRobot(spec, code);
    setMsg(null);
    setRunning(true);
    setTrail([]);
    let i = 0;
    timer.current = setInterval(() => {
      const step = result.path[i];
      setPos(step);
      setTrail((t) => [...t, `${step.x},${step.y}`]);
      i++;
      if (i >= result.path.length) {
        clearInterval(timer.current!);
        setRunning(false);
        const line = result.error
          ? { pass: false, text: result.error }
          : result.reachedGoal
            ? { pass: true, text: `Goal reached in ${result.path.length - 1} moves.` }
            : { pass: false, text: "The robot stopped before reaching the goal." };
        setMsg(line);
        void saveProgress(c.slug, result.reachedGoal && !result.error, code);
      }
    }, 220);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <div className="inline-grid gap-0.5 p-2 rounded-xl bg-surface-2" style={{ gridTemplateColumns: `repeat(${spec.grid[0].length}, 2.25rem)` }} role="img" aria-label="Robot board">
          {spec.grid.flatMap((row, y) =>
            [...row].map((cell, x) => {
              const here = pos.x === x && pos.y === y;
              const visited = trail.includes(`${x},${y}`);
              return (
                <div key={`${x}-${y}`} className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold ${cell === "#" ? "bg-ink/80" : goal && goal.x === x && goal.y === y ? "bg-good/30" : visited ? "bg-brand/15" : "bg-surface"}`}>
                  {here ? <span className="text-brand text-lg" aria-label={`Robot facing ${pos.dir}`}>{ARROW[pos.dir]}</span> : goal && goal.x === x && goal.y === y ? "★" : ""}
                </div>
              );
            }),
          )}
        </div>
        <p className="hint mt-2">Dark squares are walls; ★ is the goal. Commands: <code>forward 2</code>, <code>left</code>, <code>right</code>, <code>repeat 3 {"{ … }"}</code></p>
      </div>
      <div>
        <label htmlFor={`robot-${c.slug}`} className="label">Program</label>
        <textarea id={`robot-${c.slug}`} className="textarea font-mono text-sm" rows={8} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="btn btn-primary" onClick={run} disabled={running}><Play className="w-4 h-4" aria-hidden /> {running ? "Running…" : "Run robot"}</button>
          <button type="button" className="btn btn-secondary" onClick={() => { if (timer.current) clearInterval(timer.current); setRunning(false); setPos(spec.start); setTrail([]); setMsg(null); }}><RotateCcw className="w-4 h-4" aria-hidden /> Reset</button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowHint(!showHint)}>{showHint ? "Hide hint" : "Hint"}</button>
        </div>
        {showHint && <p className="mt-2 text-sm rounded-lg bg-brand/5 border border-brand/20 p-2.5">{c.hint}</p>}
        {msg && <Result lines={[msg]} />}
      </div>
    </div>
  );
}
