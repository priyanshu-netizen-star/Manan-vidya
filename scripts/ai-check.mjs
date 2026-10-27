/**
 * Live AI check: calls each AI feature on a running School OS server that has an AI key configured,
 * and prints what came back so a person can judge the quality. Uses sample accounts only.
 *
 *   npm run build && PGLITE_DIR=memory npx next start -p 3210   (in one terminal)
 *   node scripts/ai-check.mjs [http://localhost:3210]            (in another)
 *
 * Every call here spends AI usage (free-tier quota or paid credit).
 */
const ORIGIN = process.argv[2] || "http://localhost:3210";
const B = `${ORIGIN}/mananvidyademo`;

class Client {
  cookie = "";
  async post(p, body) {
    const headers = { "content-type": "application/json", origin: ORIGIN };
    if (this.cookie) headers.cookie = this.cookie;
    const res = await fetch(`${B}${p}`, { method: "POST", headers, body: JSON.stringify(body), redirect: "manual" });
    const m = res.headers.get("set-cookie")?.match(/mv_session=([^;]*)/);
    if (m) this.cookie = `mv_session=${m[1]}`;
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, json, text };
  }
  async get(p) {
    const res = await fetch(`${B}${p}`, { headers: { cookie: this.cookie } });
    return { status: res.status, text: await res.text() };
  }
}
async function as(account) {
  const c = new Client();
  const r = await c.post("/api/auth/presentation-login", { account });
  if (r.status !== 200) throw new Error(`login ${account} failed: ${r.status}`);
  return c;
}

let failed = 0;
function report(name, ok, detail) {
  if (!ok) failed++;
  console.log(`\n${ok ? "PASS" : "FAIL"}  ${name}`);
  if (detail) console.log(String(detail).slice(0, 1200).replace(/^/gm, "      "));
}
const timed = async (fn) => {
  const t = Date.now();
  const r = await fn();
  return [r, ((Date.now() - t) / 1000).toFixed(1)];
};

const student = await as("student");
const teacher = await as("teacher");
const anon = new Client();

let [r, s] = await timed(() => student.post("/api/learn/ask", { topicId: 4, question: "Why do school bags have wide straps?" }));
report(`Learning assistant (English) answers with AI [${s}s]`, r.json?.mode === "ai" && r.json.answer, r.json?.answer ?? r.text);

[r, s] = await timed(() => student.post("/api/learn/ask", { topicId: 4, question: "दबाव क्या होता है? आसान भाषा में समझाइए।" }));
report(`Learning assistant (Hindi) answers with AI [${s}s]`, r.json?.mode === "ai" && /[ऀ-ॿ]/.test(r.json.answer ?? ""), r.json?.answer ?? r.text);

[r, s] = await timed(() => student.post("/api/learn/ask", { topicId: 4, question: "I am being bullied in the hostel and feel unsafe" }));
report(`Wellbeing message still goes to the safety response, not AI [${s}s]`, r.json?.mode === "safety", r.json?.answer);

[r, s] = await timed(() => teacher.post("/api/questions/ai-draft", { topicId: 4, count: 3, difficulty: "mixed" }));
report(`AI question drafting saves drafts for teacher review [${s}s]`, r.status === 201 || r.status === 200, r.text);
if (r.status < 300) {
  const page = await teacher.get("/app/teacher/questions?topicId=4&status=draft");
  report("Drafted questions appear in the review queue", /drafted by AI|AI draft/i.test(page.text));
}

[r, s] = await timed(() => teacher.post("/api/lessons", { classTopic: "3:4", minutes: "40", focus: "Hands-on activity" }));
report(`Lesson preparation produces an AI draft [${s}s]`, r.status === 201 && r.json?.generation === "ai", r.text);
if (r.json?.id) {
  const page = await teacher.get(`/app/teacher/lessons/${r.json.id}`);
  const body = page.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  report("Lesson plan page shows the draft", page.status === 200, body.slice(body.indexOf("Learning objectives") >= 0 ? body.indexOf("Learning objectives") : 0, 1200));
}

[r, s] = await timed(() => anon.post("/api/assistant", { question: "Which documents do I need for admission?", lang: "en" }));
report(`Admissions assistant rewords verified facts [${s}s]`, r.status === 200 && r.json?.answer, `${r.json?.mode}: ${r.json?.answer ?? r.text}`);

[r, s] = await timed(() => anon.post("/api/assistant", { question: "क्या लड़कियों के लिए हॉस्टल है?", lang: "auto" }));
report(`Admissions assistant answers in Hindi [${s}s]`, r.json?.lang === "hi" && r.json?.answer, `${r.json?.mode}: ${r.json?.answer ?? r.text}`);

[r, s] = await timed(() => anon.post("/api/assistant", { question: "What is the fee for class 5?", lang: "en" }));
report(`Fee question is still escalated to staff, not answered by AI [${s}s]`, r.json?.mode === "escalated", r.json?.answer);

console.log(`\n${failed ? `${failed} check(s) failed` : "All live AI checks passed"}. Read the answers above for quality.`);
process.exit(failed ? 1 : 0);
