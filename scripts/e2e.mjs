#!/usr/bin/env node
/**
 * End-to-end verification against the PRODUCTION build (`npm run build` first).
 *
 * Starts `next start` on a free port with a fresh in-memory database, then checks:
 *   A. routing under /mananvidyademo, refresh of deep links, 404s
 *   B. page access for every role (allowed pages load, others are refused)
 *   C. security boundaries (CSRF origin check, authentication, authorisation, data scoping,
 *      answer leakage, rate limiting, presentation-only endpoints)
 *   D. user journeys through the real API (quiz scoring, quiz publishing, enquiries,
 *      hostel workflow, attendance, marks, tasks, knowledge base, assistant, reports)
 *   E. browser checks in real Chrome/Edge: UI flows, mobile layout, no horizontal scroll
 *
 * Usage: node scripts/e2e.mjs [--no-browser]
 * Output: test-results/e2e-report.json and screenshots in test-results/screens/.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const BASE_PATH = "/mananvidyademo";
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail: ok ? "" : String(detail).slice(0, 400) });
  if (!ok) failures++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${ok ? "" : `  ←  ${String(detail).slice(0, 200)}`}`);
}

/** Records a UI wait as a pass/fail check without aborting the rest of the run. */
async function waitCheck(name, promise) {
  try {
    await promise;
    check(name, true);
  } catch (e) {
    check(name, false, e.message);
  }
}

const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

const port = await freePort();
const ORIGIN = `http://localhost:${port}`;
const B = `${ORIGIN}${BASE_PATH}`;

console.log(`Starting production server on ${ORIGIN} (in-memory database)…`);
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: { ...process.env, PGLITE_DIR: "memory", APP_ENV: "presentation", ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "", AI_PROVIDER: "anthropic", DATABASE_URL: "", NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => { try { server.kill(); } catch { /* ignore */ } };
process.on("exit", stop);

for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${B}/login`);
    if (r.status === 200) break;
  } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 500));
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

class Client {
  constructor() { this.cookie = ""; }
  async req(method, p, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (this.cookie) headers.cookie = this.cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    if (method !== "GET" && !("origin" in extraHeaders)) headers.origin = ORIGIN;
    const res = await fetch(`${B}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = set.match(/mv_session=([^;]*)/);
      if (m) this.cookie = m[1] ? `mv_session=${m[1]}` : "";
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, json, text, location: res.headers.get("location") || "", headers: res.headers };
  }
  get(p) { return this.req("GET", p); }
  post(p, b = {}) { return this.req("POST", p, b); }
  patch(p, b = {}) { return this.req("PATCH", p, b); }
  del(p) { return this.req("DELETE", p, {}); }
  async as(account) {
    const r = await this.post("/api/auth/presentation-login", { account });
    if (r.status !== 200) throw new Error(`login ${account} failed: ${r.status} ${r.text}`);
    return this;
  }
}
const as = (account) => new Client().as(account);
/** YYYY-MM-DD in India Standard Time, offset by whole days. */
const istDate = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600e3 + offsetDays * 864e5).toISOString().slice(0, 10);
const fresh = () => new Client();

try {
  // ─── A. Routing ───────────────────────────────────────────────────────────
  console.log("\nA. Routing and subpath");
  const anon = fresh();
  for (const p of ["", "/login", "/admissions", "/guide", "/guide/executive-summary", "/guide/user-manuals", "/privacy"]) {
    const r = await anon.get(p);
    check(`public page ${p} loads`, r.status === 200, r.status);
  }
  const home = await anon.get("");
  check("proposal page shows total fee ₹3,50,000", home.text.includes("₹3,50,000"));
  check("proposal page shows the ₹15,000 reconciliation row", home.text.includes("₹15,000"));
  check("proposal page states it is not endorsed by the school", home.text.includes("not been commissioned, approved or endorsed"));
  check("proposal page is marked noindex", /<meta name="robots" content="noindex, nofollow"/.test(home.text));
  const noSlash = await fetch(B, { redirect: "manual" });
  check("bare subpath /mananvidyademo serves the proposal", noSlash.status === 200, noSlash.status);
  const outside = await fetch(`${ORIGIN}/`, { redirect: "manual" });
  check("paths outside the subpath are not served by this zone", outside.status === 404, outside.status);
  check("unknown page returns 404", (await anon.get("/does-not-exist")).status === 404);
  const prot = await anon.get("/app/learn");
  check("protected page redirects to sign-in when signed out", prot.status === 307 && prot.location.includes(`${BASE_PATH}/login`), `${prot.status} ${prot.location}`);
  check("internal documents are not served", (await anon.get("/guide/deployment")).status === 404);
  check("security headers present", home.headers.get("x-frame-options") === "DENY" && home.headers.get("x-content-type-options") === "nosniff");
  check("no x-powered-by header", !home.headers.get("x-powered-by"));

  // ─── B. Page access by role ───────────────────────────────────────────────
  console.log("\nB. Page access by role");
  const PAGES = {
    student: { ok: ["/app", "/app/study", "/app/study?topic=4", "/app/learn", "/app/learn/1", "/app/quiz/1", "/app/progress", "/app/coding", "/app/coding/py-hello", "/app/coding/robot-moves", "/app/hostel/leave", "/app/hostel/maintenance"], no: ["/app/teacher", "/app/enquiries", "/app/students", "/app/command", "/app/users", "/app/hostel/rooms", "/app/attendance"] },
    parent: { ok: ["/app", "/app/progress", "/app/report-cards", "/app/hostel/leave"], no: ["/app/study", "/app/learn", "/app/teacher", "/app/students", "/app/enquiries", "/app/command", "/app/hostel/rollcall"] },
    teacher: { ok: ["/app", "/app/teacher", "/app/teacher/content", "/app/teacher/content/1", "/app/teacher/questions", "/app/teacher/questions/1", "/app/teacher/quizzes", "/app/teacher/quizzes/1", "/app/teacher/worksheets", "/app/teacher/lessons", "/app/teacher/performance", "/app/learn", "/app/attendance", "/app/exams", "/app/exams/5", "/app/students", "/app/students/25", "/app/report-cards", "/app/report-cards/25?exam=5", "/app/worksheet/1", "/app/tasks", "/app/coding", "/app/study"], no: ["/app/enquiries", "/app/command", "/app/users", "/app/hostel/rooms", "/app/knowledge"] },
    office: { ok: ["/app", "/app/enquiries", "/app/enquiries/1", "/app/knowledge", "/app/students", "/app/students/1", "/app/attendance", "/app/exams", "/app/report-cards", "/app/reports", "/app/reports?r=attendance-30d", "/app/reports?r=exam-results", "/app/reports?r=low-attendance", "/app/reports?r=enquiry-pipeline", "/app/reports?r=quiz-participation", "/app/tasks", "/app/hostel"], no: ["/app/teacher", "/app/command", "/app/users", "/app/hostel/rollcall", "/app/learn", "/app/study"] },
    warden: { ok: ["/app", "/app/hostel", "/app/hostel/leave", "/app/hostel/rollcall", "/app/hostel/rooms", "/app/hostel/maintenance", "/app/students", "/app/tasks"], no: ["/app/teacher", "/app/enquiries", "/app/command", "/app/exams"] },
    management: { ok: ["/app", "/app/command", "/app/command?days=30&classId=3", "/app/command?q=Aarav", "/app/enquiries", "/app/reports", "/app/teacher/performance", "/app/teacher/content", "/app/teacher/questions", "/app/hostel", "/app/audit", "/app/tasks?view=all", "/app/report-cards"], no: ["/app/users", "/app/hostel/rollcall", "/app/learn"] },
    admin: { ok: ["/app", "/app/study", "/app/users", "/app/audit", "/app/system", "/app/command", "/app/teacher", "/app/hostel/rooms", "/app/knowledge"], no: [] },
  };
  for (const [role, { ok, no }] of Object.entries(PAGES)) {
    const c = await as(role);
    for (const p of ok) {
      const r = await c.get(p);
      check(`${role} can open ${p}`, r.status === 200, `${r.status} ${r.location}`);
    }
    for (const p of no) {
      const r = await c.get(p);
      check(`${role} is refused ${p}`, r.status === 307 && r.location.includes("denied=1"), `${r.status} ${r.location}`);
    }
  }
  const t = await as("teacher");
  const deep = await t.get("/app/teacher/quizzes/1");
  check("deep link loads directly (refresh works)", deep.status === 200 && deep.text.includes("Rational Numbers"));
  check("server log has no React/RSC errors so far", !/Functions cannot be passed|Error:/.test(serverLog), serverLog.match(/.*Error.*/)?.[0]);

  // ─── C. Security boundaries ───────────────────────────────────────────────
  console.log("\nC. Security boundaries");
  const noOrigin = await t.req("POST", "/api/tasks", { title: "x" }, { origin: "" });
  check("state-changing request without Origin is refused", noOrigin.status === 403, noOrigin.status);
  const evil = await t.req("POST", "/api/tasks", { title: "Injected task", module: "it", assigneeId: "", dueDate: "" }, { origin: "https://evil.example" });
  check("cross-site request is refused (CSRF)", evil.status === 403, evil.status);
  check("unauthenticated API call is refused", (await fresh().post("/api/tasks", { title: "x" })).status === 401);
  const student = await as("student");
  check("student cannot call staff API (enquiries)", (await student.patch("/api/enquiries/1", { action: "note", note: "hello" })).status === 403);
  check("student cannot create users", (await student.post("/api/users", { email: "x@y.example", name: "X", role: "platform_admin", studentId: "", password: "abcdefghij1" })).status === 403);
  check("student cannot approve material", (await student.patch("/api/materials/1", { action: "approve" })).status === 403);
  check("student cannot change marks", (await student.post("/api/exams/5/marks", { subjectId: 1, entries: [{ studentId: 25, marks: 50 }] })).status === 403);
  const quizHtml = await student.get("/app/quiz/1");
  check("quiz page does not leak correct answers or explanations", quizHtml.status === 200 && !quizHtml.text.includes("correct_index") && !quizHtml.text.includes("5/0 has a zero denominator"), quizHtml.status);
  check("student cannot open a quiz for another class", (await student.get("/app/quiz/9")).location.includes("/app/learn"));
  check("student cannot submit to another class's quiz", (await student.post("/api/quizzes/9/attempt", { answers: {} })).status === 403);
  const parent = await as("parent");
  check("parent cannot open another student's report card", (await parent.get("/app/report-cards/26?exam=5")).status === 404);
  check("parent can open own child's finalised report card", (await parent.get("/app/report-cards/25?exam=5")).status === 200);
  check("parent cannot open own child's provisional (open) report card", (await parent.get("/app/report-cards/25?exam=6")).status === 404);
  check("teacher cannot edit content outside their subjects", (await t.patch("/api/materials/7", { action: "edit", title: "Changed title", body: "x".repeat(30) })).status === 403);
  check("teacher cannot enter marks for a subject they do not teach", (await t.post("/api/exams/6/marks", { subjectId: 3, entries: [{ studentId: 25, marks: 40 }] })).status === 403);
  const mcqPage = await student.get("/app/coding/ai-what");
  check("AI-literacy answers are not sent to the browser", mcqPage.status === 200 && !/"answer":\d/.test(mcqPage.text));
  check("malformed JSON is rejected cleanly", (await t.req("POST", "/api/tasks", undefined, { "content-type": "application/json" })).status !== 500);
  const bad = await fresh().post("/api/auth/login", { email: "teacher@school-os.example", password: "wrong-password" });
  check("wrong password gives a generic error", bad.status === 401 && bad.json?.error === "Incorrect email or password.");
  const ok = await fresh().post("/api/auth/login", { email: "teacher@school-os.example", password: "Presentation@2026" });
  check("password sign-in works", ok.status === 200, ok.text);
  const cookieHeader = ok.headers.get("set-cookie") || "";
  check("session cookie is HttpOnly, SameSite=Lax and scoped to the subpath", /HttpOnly/i.test(cookieHeader) && /SameSite=lax/i.test(cookieHeader) && cookieHeader.includes(`Path=${BASE_PATH}`), cookieHeader);
  const out = fresh();
  await out.as("teacher");
  await out.post("/api/auth/logout");
  check("signed-out session no longer works", (await out.get("/app")).status === 307);

  // ─── D. User journeys ─────────────────────────────────────────────────────
  console.log("\nD. User journeys");
  // D1. Student takes the Force and Pressure quiz (Class VIII) and is scored correctly.
  const learn = await student.get("/app/learn");
  check("student sees only Class VIII topics", learn.text.includes("Force and Pressure") && !learn.text.includes("Nutrition in Plants"));
  const fpQuizId = Number((await student.get("/app/learn/4")).text.match(/\/app\/quiz\/(\d+)/)?.[1]);
  const fpHtml = await student.get(`/app/quiz/${fpQuizId}`);
  const qIds = [...fpHtml.text.matchAll(/name="q-(\d+)"/g)].map((m) => Number(m[1]));
  const uniqueQ = [...new Set(qIds)];
  check("quiz page lists 5 questions", uniqueQ.length === 5, uniqueQ.length);
  // Seed answer key for Force and Pressure: [1, 2, 1, 1, 2]. Answer 3 correctly, 1 wrong, 1 blank.
  const key = [1, 2, 1, 1, 2];
  const answers = { [uniqueQ[0]]: key[0], [uniqueQ[1]]: key[1], [uniqueQ[2]]: key[2], [uniqueQ[3]]: (key[3] + 1) % 4 };
  const scored = await student.post(`/api/quizzes/${fpQuizId}/attempt`, { answers });
  check("quiz scored 3/5 (60%) on the server", scored.json?.score === 3 && scored.json?.total === 5 && scored.json?.percent === 60, scored.text);
  check("wrong answer is identified with the correct option", scored.json?.results?.[3]?.isCorrect === false && scored.json?.results?.[3]?.correctIndex === key[3]);
  check("unanswered question counts as wrong", scored.json?.results?.[4]?.chosen === null && scored.json?.results?.[4]?.isCorrect === false);
  check("explanations returned after submission", typeof scored.json?.explanations?.[uniqueQ[3]] === "string" && scored.json.explanations[uniqueQ[3]].length > 10);
  check("attempt saved for student", scored.json?.saved === true);
  const progress = await student.get("/app/progress");
  check("progress page shows the new attempt", progress.text.includes("Force and Pressure") && /3(<!-- -->)? \/ (<!-- -->)?5/.test(progress.text));
  const perfect = await student.post(`/api/quizzes/${fpQuizId}/attempt`, { answers: Object.fromEntries(uniqueQ.map((id, i) => [id, key[i]])) });
  check("all-correct submission scores 5/5", perfect.json?.score === 5 && perfect.json?.percent === 100);
  check("answer for a question outside the quiz is rejected", (await student.post(`/api/quizzes/${fpQuizId}/attempt`, { answers: { 99999: 1 } })).status === 400);

  // D2. Ask a question (AI not configured -> approved material, clearly labelled).
  const ask = await student.post("/api/learn/ask", { topicId: 4, question: "Why do school bags have wide straps?" });
  check("learning assistant answers from approved material when AI is off", ask.json?.mode === "materials" && /not configured/i.test(ask.json?.notice) && ask.json?.sources?.[0]?.text.includes("straps"), ask.text);
  const safety = await student.post("/api/learn/ask", { topicId: 4, question: "I am being bullied in the hostel and feel unsafe" });
  check("wellbeing message is routed to trusted adults, not answered", safety.json?.mode === "safety" && safety.json.answer.includes("1098"));
  check("student cannot ask about another class's topic", (await student.post("/api/learn/ask", { topicId: 9, question: "What is photosynthesis?" })).status === 403);

  // D3. Teacher creates a question, approves it, builds a quiz and publishes it; the student sees it.
  const newQ = await t.post("/api/questions", { topicId: 4, prompt: "Which unit is used to measure force?", options: ["Pascal", "Newton", "Joule", "Metre"], correctIndex: "1", explanation: "Force is measured in newtons (N).", difficulty: "easy" });
  check("teacher creates a draft question", newQ.status === 201, newQ.text);
  check("teacher approves the question", (await t.patch(`/api/questions/${newQ.json.id}`, { action: "approve" })).status === 200);
  check("duplicate options are rejected", (await t.post("/api/questions", { topicId: 4, prompt: "Duplicate options test", options: ["A", "A", "B", "C"], correctIndex: "0", explanation: "Testing validation" })).status === 400);
  const quiz = await t.post("/api/quizzes", { title: "Force check (e2e)", classTopic: "3:4", instructions: "" });
  check("teacher creates a draft quiz", quiz.status === 201, quiz.text);
  check("publishing an empty quiz is refused", (await t.patch(`/api/quizzes/${quiz.json.id}`, { action: "publish" })).status === 400);
  const draftQ = (await t.get("/app/teacher/questions?topicId=4&status=draft")).text;
  const draftId = Number(draftQ.match(/\/app\/teacher\/questions\/(\d+)/)?.[1]);
  check("unapproved question cannot be added to a quiz", (await t.patch(`/api/quizzes/${quiz.json.id}`, { action: "edit", title: "Force check (e2e)", instructions: "", questionIds: [draftId] })).status === 400);
  const edit = await t.patch(`/api/quizzes/${quiz.json.id}`, { action: "edit", title: "Force check (e2e)", instructions: "Two questions", questionIds: [String(newQ.json.id), String(uniqueQ[0])] });
  check("teacher adds approved questions", edit.status === 200, edit.text);
  check("teacher publishes the quiz", (await t.patch(`/api/quizzes/${quiz.json.id}`, { action: "publish" })).status === 200);
  check("published quiz cannot be edited", (await t.patch(`/api/quizzes/${quiz.json.id}`, { action: "edit", title: "Changed", instructions: "", questionIds: [] })).status === 409);
  const sees = await student.get("/app/learn/4");
  check("student now sees the teacher's new quiz", sees.text.includes("Force check (e2e)"));
  const take = await student.post(`/api/quizzes/${quiz.json.id}/attempt`, { answers: { [newQ.json.id]: 1, [uniqueQ[0]]: key[0] } });
  check("student scores 2/2 on the new quiz", take.json?.score === 2 && take.json?.total === 2, take.text);
  const results = await t.get(`/app/teacher/quizzes/${quiz.json.id}`);
  check("teacher sees the student's result", results.text.includes("Aarav Kumar") && results.text.includes("2/2"));

  // D4. Material approval loop and AI features without a key.
  const mat = await t.post("/api/materials", { topicId: 4, title: "E2E material", body: "Pressure is force per unit area. This material was written by an automated test." });
  check("teacher saves material as draft", mat.status === 201);
  check("draft material is not visible to students", !(await student.get("/app/learn/4")).text.includes("E2E material"));
  await t.patch(`/api/materials/${mat.json.id}`, { action: "approve" });
  check("approved material becomes visible to students", (await student.get("/app/learn/4")).text.includes("E2E material"));
  const aiq = await t.post("/api/questions/ai-draft", { topicId: 4, count: 3, difficulty: "mixed" });
  check("AI question drafting reports it is unavailable when not configured (no fake output)", aiq.status === 503 && /not been configured/i.test(aiq.json?.error), aiq.text);
  const lesson = await t.post("/api/lessons", { classTopic: "3:4", minutes: "40", focus: "" });
  check("lesson preparation builds a labelled template without AI", lesson.status === 201 && lesson.json.generation === "template", lesson.text);
  const lessonPage = await t.get(`/app/teacher/lessons/${lesson.json.id}`);
  check("template lesson plan uses approved material", lessonPage.text.includes("Template from approved material") && lessonPage.text.includes("Exit check"));
  check("another teacher cannot open this lesson plan", (await (await as("teacher2")).get(`/app/teacher/lessons/${lesson.json.id}`)).status === 404);

  // D5. Admissions: assistant, enquiry, tracking, staff workflow.
  const a1 = await anon.post("/api/assistant", { question: "Which documents are required for admission?", lang: "en" });
  check("assistant answers a covered question from the knowledge base", a1.json?.mode === "knowledge_base" && a1.json.answer.includes("birth certificate"), a1.text);
  check("assistant shows the answer's verification status", /public website/i.test(a1.json?.sources?.[0]?.verification ?? ""));
  const a2 = await anon.post("/api/assistant", { question: "क्या स्कूल में हॉस्टल की सुविधा है?", lang: "auto" });
  check("assistant answers in Hindi and flags unreviewed translation", a2.json?.lang === "hi" && a2.json.answer.includes("हॉस्टल") && a2.json.sources[0].translationPending === true, a2.text);
  const a3 = await anon.post("/api/assistant", { question: "What is the fee for class 5?", lang: "en" });
  check("fee question is escalated to staff", a3.json?.mode === "escalated", a3.text);
  const a4 = await anon.post("/api/assistant", { question: "What is the student teacher ratio?", lang: "en" });
  check("unpublished (conflicting) fact is not answered", a4.json?.mode === "escalated");
  const enq = await anon.post("/api/enquiries", { parentName: "Test Parent", phone: "9000000001", email: "", childName: "Test Child", gradeSought: "Class VI", boardingInterest: "boarding", message: "Is there a hostel for girls?", language: "en", consent: true, website: "" });
  check("parent submits an enquiry and gets a reference", enq.status === 201 && /^MV-[A-Z2-9]{6}$/.test(enq.json?.ref), enq.text);
  check("enquiry without consent is refused", (await anon.post("/api/enquiries", { parentName: "No Consent", phone: "9000000002", childName: "Child", gradeSought: "KG", consent: false })).status === 400);
  check("honeypot submission is refused", (await anon.post("/api/enquiries", { parentName: "Bot", phone: "9000000003", childName: "Bot", gradeSought: "KG", consent: true, website: "http://spam" })).status === 400);
  const tr1 = await anon.post("/api/enquiries/track", { ref: enq.json.ref, phone: "+91 90000 00001" });
  check("parent tracks the enquiry (status New)", tr1.json?.statusLabel === "New", tr1.text);
  check("tracking with the wrong phone is refused", (await anon.post("/api/enquiries/track", { ref: enq.json.ref, phone: "9999999999" })).status === 404);
  const office = await as("office");
  const list = await office.get(`/app/enquiries?q=${enq.json.ref}`);
  const enqId = Number(list.text.match(/\/app\/enquiries\/(\d+)/)?.[1]);
  check("office finds the enquiry", enqId > 0);
  check("invalid status jump is refused (new → admitted)", (await office.patch(`/api/enquiries/${enqId}`, { action: "status", to: "admitted", note: "x" })).status === 409);
  check("office marks contacted", (await office.patch(`/api/enquiries/${enqId}`, { action: "status", to: "contacted", note: "Called" })).status === 200);
  check("office schedules a visit", (await office.patch(`/api/enquiries/${enqId}`, { action: "status", to: "visit_scheduled", note: "" })).status === 200);
  check("office sets a follow-up date", (await office.patch(`/api/enquiries/${enqId}`, { action: "follow_up", date: "2030-01-15" })).status === 200);
  check("office adds a note", (await office.patch(`/api/enquiries/${enqId}`, { action: "note", note: "Parent prefers Saturday" })).status === 200);
  const tr2 = await anon.post("/api/enquiries/track", { ref: enq.json.ref, phone: "9000000001" });
  check("tracking shows the updated status and history", tr2.json?.statusLabel === "Visit / interaction scheduled" && tr2.json.history.length === 3, tr2.text);
  check("staff notes are not exposed to parents", !JSON.stringify(tr2.json).includes("Saturday"));
  const detail = await office.get(`/app/enquiries/${enqId}`);
  check("enquiry timeline records each step", detail.text.includes("Parent prefers Saturday") && detail.text.includes("Called"));
  const kb = await office.patch("/api/kb/1", { category: "About the school", question_en: "Tell me about the school. When was it founded?", answer_en: "Confirmed answer from the e2e test.", question_hi: "", answer_hi: "", keywords: "about,history,founded", source: "Office", verification: "school_confirmed", hindi_reviewed: false, published: true });
  check("office updates and confirms a knowledge-base answer", kb.status === 200, kb.text);
  const a5 = await anon.post("/api/assistant", { question: "When was the school founded?", lang: "en" });
  check("assistant uses the updated, school-confirmed answer", a5.json?.answer.includes("Confirmed answer") && a5.json.sources[0].verified === true, a5.text);

  // D6. Hostel: parent requests leave, warden decides, check-out/return, roll-call, maintenance.
  const depart = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const back = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const lv = await parent.post("/api/hostel/leave", { kind: "leave", departAt: `${depart}T09:00`, returnAt: `${back}T17:00`, reason: "Family function at home", destination: "Home", escortName: "Sunita Devi" });
  check("overlapping leave for the same student is refused", lv.status === 409, lv.text); // seeded pending leave overlaps
  const later1 = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const later2 = new Date(Date.now() + 11 * 864e5).toISOString().slice(0, 10);
  const lv2 = await parent.post("/api/hostel/leave", { kind: "leave", departAt: `${later1}T09:00`, returnAt: `${later2}T17:00`, reason: "Doctor appointment at home town", destination: "Home", escortName: "Sunita Devi" });
  check("parent submits a leave request", lv2.status === 201, lv2.text);
  check("return before departure is refused", (await parent.post("/api/hostel/leave", { kind: "outpass", departAt: `${later2}T15:00`, returnAt: `${later2}T10:00`, reason: "Testing order", destination: "Town", escortName: "Parent" })).status === 400);
  check("parent cannot approve their own request", (await parent.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "approved" })).status === 403);
  const warden = await as("warden");
  check("warden must give a reason to reject", (await warden.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "rejected", note: "" })).status === 400);
  check("warden approves", (await warden.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "approved", note: "" })).status === 200);
  check("cannot return before checking out", (await warden.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "returned" })).status === 409);
  check("warden records check-out", (await warden.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "checked_out" })).status === 200);
  check("warden records return", (await warden.patch(`/api/hostel/leave/${lv2.json.id}`, { to: "returned" })).status === 200);
  const parentView = await parent.get("/app/hostel/leave");
  check("parent sees the decision history", parentView.text.includes("Returned") && parentView.text.includes("Manoj Oraon"));
  const rcPage = await warden.get("/app/hostel/rollcall");
  const boarderIds = [...new Set([...rcPage.text.matchAll(/aria-label="Roll-call for [^"]+"/g)].map((m) => m[0]))].length;
  check("roll-call lists boarders", boarderIds > 5, boarderIds);
  const rc = await warden.post("/api/hostel/rollcall", { date: istDate(-1), session: "night", entries: [{ studentId: 25, status: "present" }] });
  check("warden saves roll-call", rc.status === 200, rc.text);
  const dayScholar = await office.post("/api/students", { admissionNo: "E2E-001", name: "E2E Day Scholar", classId: "3", rollNo: "", gender: "F", dateOfBirth: "", guardianName: "", guardianPhone: "", isBoarder: false });
  check("office adds a (sample) student record", dayScholar.status === 201, dayScholar.text);
  check("roll-call refuses a non-boarder", (await warden.post("/api/hostel/rollcall", { date: istDate(-1), session: "night", entries: [{ studentId: dayScholar.json.id, status: "present" }] })).status === 400);
  check("leave for a non-boarder is refused", (await warden.post("/api/hostel/leave", { studentId: dayScholar.json.id, kind: "outpass", departAt: `${istDate(5)}T10:00`, returnAt: `${istDate(5)}T15:00`, reason: "Testing day scholar", destination: "Town", escortName: "Parent" })).status === 400);
  check("duplicate admission number refused", (await office.post("/api/students", { admissionNo: "E2E-001", name: "Duplicate", classId: "3", rollNo: "", gender: "M", dateOfBirth: "", guardianName: "", guardianPhone: "", isBoarder: false })).status === 409);
  const mr = await student.post("/api/hostel/maintenance", { category: "electrical", description: "Light near my bed is not working", priority: "normal" });
  check("boarder raises maintenance request for own room", mr.status === 201, mr.text);
  check("warden moves maintenance to in progress", (await warden.patch(`/api/hostel/maintenance/${mr.json.id}`, { to: "in_progress", assignedTo: "Electrician", note: "" })).status === 200);
  check("invalid maintenance transition refused", (await warden.patch(`/api/hostel/maintenance/${mr.json.id}`, { to: "closed" })).status === 409);

  // D7. Attendance, marks, report card, tasks, reports.
  const attPage = await t.get("/app/attendance?classId=3");
  const attIds = [...new Set([...attPage.text.matchAll(/aria-label="Attendance for ([^"]+)"/g)].map((m) => m[1]))];
  check("attendance register lists Class VIII (12 seeded + 1 added by this run)", attIds.length === 13, attIds.length);
  const today = istDate(0);
  const studentsVIII = Array.from({ length: 12 }, (_, i) => 25 + i);
  const saveAtt = await t.post("/api/attendance", { classId: 3, date: today, entries: studentsVIII.map((id, i) => ({ studentId: id, status: i === 0 ? "absent" : "present" })) });
  check("teacher saves today's register", saveAtt.status === 200 && saveAtt.json.saved === 12, saveAtt.text);
  check("future attendance refused", (await t.post("/api/attendance", { classId: 3, date: "2099-01-01", entries: [{ studentId: 25, status: "present" }] })).status === 400);
  check("attendance for a student from another class refused", (await t.post("/api/attendance", { classId: 3, date: today, entries: [{ studentId: 1, status: "present" }] })).status === 400);
  const marks = await t.post("/api/exams/6/marks", { subjectId: 1, entries: [{ studentId: 25, marks: 88.5 }, { studentId: 26, marks: null }] });
  check("teacher enters Half-Yearly maths marks", marks.status === 200, marks.text);
  check("marks above maximum refused", (await t.post("/api/exams/6/marks", { subjectId: 1, entries: [{ studentId: 25, marks: 101 }] })).status === 400);
  check("marks for a locked exam refused", (await t.post("/api/exams/5/marks", { subjectId: 1, entries: [{ studentId: 25, marks: 40 }] })).status === 409);
  const rcard = await t.get("/app/report-cards/25?exam=6");
  check("provisional report card shows the new mark", rcard.text.includes("88.5") && rcard.text.includes("PROVISIONAL"));
  const finalCard = await t.get("/app/report-cards/25?exam=5");
  check("report card shows grades and is marked as sample", /A1|A2|B1|B2|C1|C2|\bD\b/.test(finalCard.text) && finalCard.text.includes("SAMPLE"));
  const task = await office.post("/api/tasks", { title: "E2E task", description: "", module: "administration", priority: "high", assigneeId: "", dueDate: "" });
  check("office creates a task", task.status === 201, task.text);
  check("blocking a task requires a note", (await office.patch(`/api/tasks/${task.json.id}`, { to: "blocked", note: "" })).status === 400);
  check("office starts the task", (await office.patch(`/api/tasks/${task.json.id}`, { to: "in_progress" })).status === 200);
  check("office completes the task", (await office.patch(`/api/tasks/${task.json.id}`, { to: "done" })).status === 200);
  const csv = await office.get("/api/reports/attendance-30d");
  check("attendance report downloads as CSV", csv.status === 200 && (csv.headers.get("content-type") || "").includes("text/csv") && csv.text.includes("Attendance %"));
  check("student cannot download reports", (await student.get("/api/reports/class-strength")).status === 403);

  // D8. Coding activities.
  const mcq = await student.post("/api/coding/check", { slug: "ai-check-2", answers: [2, 1, 0] });
  check("AI-literacy check graded on the server (3/3)", mcq.json?.passed === true && mcq.json.correct === 3, mcq.text);
  const mcqWrong = await student.post("/api/coding/check", { slug: "ai-check-2", answers: [0, 1, 0] });
  check("wrong AI-literacy answer is marked wrong", mcqWrong.json?.correct === 2 && mcqWrong.json.passed === false);
  check("coding progress is recorded", (await student.post("/api/coding/progress", { slug: "js-even", passed: true, code: "function isEven(n){return n%2===0}" })).json?.saved === true);

  // D9. Management, users, audit.
  const mgmt = await as("management");
  const cc = await mgmt.get("/app/command");
  check("command centre shows sample-data label and charts", cc.text.includes("Sample data") && cc.text.includes("Admission enquiries by status"));
  const search = await mgmt.get("/app/command?q=Aarav");
  check("command centre search finds the student", search.text.includes("/app/students/25"));
  const admin = await as("admin");
  const nu = await admin.post("/api/users", { email: "new.teacher@school-os.example", name: "New Teacher", role: "teacher", studentId: "", password: "short" });
  check("weak password refused", nu.status === 400);
  const nu2 = await admin.post("/api/users", { email: "new.teacher@school-os.example", name: "New Teacher", role: "teacher", studentId: "", password: "Strong-pass-2026" });
  check("admin creates a staff account", nu2.status === 201, nu2.text);
  check("new account can sign in", (await fresh().post("/api/auth/login", { email: "new.teacher@school-os.example", password: "Strong-pass-2026" })).status === 200);
  check("admin deactivates the account", (await admin.patch(`/api/users/${nu2.json.id}`, { action: "deactivate" })).status === 200);
  check("deactivated account cannot sign in", (await fresh().post("/api/auth/login", { email: "new.teacher@school-os.example", password: "Strong-pass-2026" })).status === 401);
  check("admin cannot deactivate themselves", (await admin.patch("/api/users/8", { action: "deactivate" })).status === 409);
  const auditPage = await admin.get("/app/audit");
  check("audit log records actions", auditPage.text.includes("quiz.publish") && auditPage.text.includes("leave.approved"));
  const lock = fresh();
  for (let i = 0; i < 5; i++) await lock.post("/api/auth/login", { email: "warden@school-os.example", password: "bad-password" });
  const locked = await lock.post("/api/auth/login", { email: "warden@school-os.example", password: "Presentation@2026" });
  check("account locks after 5 failed sign-ins", locked.status === 401 && /locked/i.test(locked.json?.error), locked.text);

  // ─── D10. AI features (AI deliberately not configured: honest fallbacks and access control) ──────
  console.log("\nD10. AI features without an AI key");
  {
    const st = await as("student"), te = await as("teacher"), of = await as("office"), wa = await as("warden"), pa = await as("parent"), mg = await as("management");
    const auto = (r) => r.status === 200 && r.json?.mode === "automatic";

    const cp = await st.post("/api/ai/copilot", { messages: [{ role: "user", content: "What should I revise this week?" }] });
    check("Copilot answers from the student's own facts, labelled automatic", auto(cp) && /not switched on/i.test(cp.json.notice) && /You are in Class/.test(cp.json.answer), cp.text);
    const cps = await st.post("/api/ai/copilot", { messages: [{ role: "user", content: "I am being bullied in the hostel" }] });
    check("Copilot routes a wellbeing message to the safety response", cps.json?.mode === "safety" && cps.json.answer.includes("1098"));
    const cpo = await of.post("/api/ai/copilot", { messages: [{ role: "user", content: "How do I keep the assistant's answers correct?" }] });
    check("Copilot answers 'how do I' from the user guide", auto(cpo) && /user guide/i.test(cpo.json.answer), cpo.text);
    check("Copilot requires sign-in", (await fresh().post("/api/ai/copilot", { messages: [{ role: "user", content: "hi" }] })).status === 401);
    const br = await wa.post("/api/ai/briefing", {});
    check("warden briefing lists live hostel facts (automatic)", auto(br) && /leave|beds|roll-call/i.test(br.json.text), br.text);
    const brh = await mg.post("/api/ai/briefing", { scope: "hostel" });
    check("management can request the hostel briefing", auto(brh) && /beds/.test(brh.json.text));

    const notes = await st.post("/api/ai/study", { topicId: 4, mode: "notes", messages: [] });
    check("study assistant: revision notes from approved material", auto(notes) && /approved material/i.test(notes.json.answer), notes.text);
    const cards = await st.post("/api/ai/study", { topicId: 4, mode: "flashcards", messages: [] });
    check("study assistant: flashcards fall back to the approved question bank", auto(cards) && cards.json.cards.length > 0 && !!cards.json.cards[0].front && !!cards.json.cards[0].back, cards.text);
    const qm = await st.post("/api/ai/study", { topicId: 4, mode: "quiz", messages: [] });
    check("study assistant: 'quiz me' gives an approved practice question", auto(qm) && /question bank/i.test(qm.json.answer));
    const chat = await st.post("/api/ai/study", { topicId: 4, mode: "chat", messages: [{ role: "user", content: "Why do school bags have wide straps?" }] });
    check("study assistant: chat answers from approved passages", auto(chat) && /straps/i.test(chat.json.answer), chat.text);
    check("study assistant: wellbeing message gets the safety response", (await st.post("/api/ai/study", { topicId: 4, mode: "chat", messages: [{ role: "user", content: "I want to hurt myself" }] })).json?.mode === "safety");
    check("study assistant: another class's topic is refused", (await st.post("/api/ai/study", { topicId: 9, mode: "notes", messages: [] })).status === 403);
    check("study assistant: parents cannot use it", (await pa.post("/api/ai/study", { topicId: 4, mode: "notes", messages: [] })).status === 403);

    const fresh4 = await te.post("/api/questions", { topicId: 4, prompt: "Which of these increases pressure? (AI e2e)", options: ["Larger area", "Smaller area", "Less force", "Wider straps"], correctIndex: "1", explanation: "Pressure is force per unit area.", difficulty: "easy" });
    await te.patch(`/api/questions/${fresh4.json.id}`, { action: "approve" });
    check("explain-my-mistake is refused before the student has submitted that question", (await st.post("/api/ai/explain", { questionId: fresh4.json.id, chosen: 0 })).status === 403);
    const ex = await st.post("/api/ai/explain", { questionId: uniqueQ[3], chosen: (key[3] + 1) % 4 });
    check("explain-my-mistake after submitting: correct answer and explanation (automatic)", auto(ex) && /Correct answer/.test(ex.json.text), ex.text);

    const ch = await st.post("/api/ai/code-help", { slug: "py-greeting", code: "print(1)", result: "FAIL: Expected the output" });
    check("AI coding tutor falls back to the teacher's hint", auto(ch) && /hint/i.test(ch.json.text), ch.text);
    check("coding lesson page offers the AI tutor", (await st.get("/app/coding/py-hello")).text.includes("Ask the AI tutor"));

    const md = await te.post("/api/ai/material", { topicId: 4, focus: "" });
    check("AI material drafting reports AI is unavailable (no fake draft)", md.status === 503 && /not been configured/i.test(md.json?.error), md.text);
    check("students cannot draft material", (await st.post("/api/ai/material", { topicId: 4 })).status === 403);
    const ins = await te.post("/api/ai/insights", {});
    check("class insights: automatic analysis of quiz answers", auto(ins) && /average/i.test(ins.json.text), ins.text);
    check("students cannot request class insights", (await st.post("/api/ai/insights", {})).status === 403);

    const rd = await te.post("/api/ai/remark", { studentId: 25, examId: 5 });
    check("report-card remark: template draft for the teacher (automatic)", auto(rd) && rd.json.text.length > 20, rd.text);
    check("warden cannot draft report-card remarks", (await wa.post("/api/ai/remark", { studentId: 25, examId: 5 })).status === 403);
    check("parent cannot draft or save remarks", (await pa.post("/api/ai/remark", { studentId: 25, examId: 5 })).status === 403 && (await pa.req("PUT", "/api/report-remarks", { studentId: 25, examId: 5, remark: "Parent wrote this" })).status === 403);
    check("teacher saves a draft remark", (await te.req("PUT", "/api/report-remarks", { studentId: 25, examId: 5, remark: "E2E draft remark: steady progress." })).json?.status === "draft");
    check("a draft remark is hidden from the family", !(await pa.get("/app/report-cards/25?exam=5")).text.includes("E2E draft remark"));
    check("teacher approves the remark", (await te.req("PUT", "/api/report-remarks", { studentId: 25, examId: 5, remark: "E2E approved remark: steady progress.", approve: true })).json?.status === "approved");
    check("the approved remark appears on the family's report card", (await pa.get("/app/report-cards/25?exam=5")).text.includes("E2E approved remark"));

    const er = await of.post("/api/ai/enquiry-reply", { enquiryId: 1 });
    check("enquiry reply draft for staff (template, automatic)", auto(er) && /Admissions Office|प्रवेश कार्यालय/.test(er.json.text), er.text);
    check("teachers cannot draft enquiry replies", (await te.post("/api/ai/enquiry-reply", { enquiryId: 1 })).status === 403);

    const ad = await of.post("/api/ai/ask-data", { question: "Which students have low attendance?" });
    check("ask-your-data routes to the low-attendance report and summarises it", auto(ad) && ad.json.report === "low-attendance" && Array.isArray(ad.json.rows), ad.text);
    const ad2 = await mg.post("/api/ai/ask-data", { report: "exam-results" });
    check("explain-this-report summarises the chosen report", auto(ad2) && ad2.json.report === "exam-results" && ad2.json.summary.length > 10);
    check("students cannot ask the data", (await st.post("/api/ai/ask-data", { question: "attendance" })).status === 403);

    const tr = await wa.post("/api/ai/triage", { description: "Sparks coming from the switch socket near bed 3" });
    check("maintenance triage suggests electrical / urgent (automatic)", auto(tr) && tr.json.category === "electrical" && tr.json.priority === "urgent", tr.text);
    check("office staff cannot use maintenance triage", (await of.post("/api/ai/triage", { description: "Leaking tap in room" })).status === 403);

    const so = await of.get("/api/search?q=Aarav");
    check("search finds a student for office staff", so.status === 200 && so.json.results.some((r) => r.kind === "Student"), so.text);
    const ss = await st.get("/api/search?q=Aarav");
    check("search never returns student records to a student", ss.status === 200 && !ss.json.results.some((r) => r.kind === "Student"));
    const sp = await st.get("/api/search?q=Pressure");
    check("search finds topics for students", sp.json.results.some((r) => r.kind === "Topic"), sp.text);

    const ad3 = await as("admin");
    const sys = await ad3.get("/app/system");
    check("System page lists AI features with usage counts", sys.text.includes("AI features") && sys.text.includes("Ask your data"));
    const aud = await ad3.get("/app/audit");
    check("AI use is recorded in the audit log", aud.text.includes("ai.copilot") || aud.text.includes("ai.study"));
  }

  // ─── E. Browser ───────────────────────────────────────────────────────────
  if (!process.argv.includes("--no-browser")) {
    console.log("\nE. Browser (real Chrome)");
    const { chromium } = await import("playwright-core");
    const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => existsSync(p));
    if (!exe) {
      check("browser available for UI tests", false, "No Chrome/Edge found");
    } else {
      const shots = path.join("test-results", "screens");
      mkdirSync(shots, { recursive: true });
      const browser = await chromium.launch({ executablePath: exe, headless: true });
      const consoleErrors = [];
      const newPage = async (width, height) => {
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
        page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`); });
        return page;
      };
      const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

      for (const [w, h, label] of [[375, 812, "mobile"], [768, 1024, "tablet"], [1366, 900, "desktop"]]) {
        const page = await newPage(w, h);
        for (const p of ["/", "/admissions", "/login", "/guide/user-manuals"]) {
          await page.goto(`${B}${p}`, { waitUntil: "networkidle" });
          check(`${label}: ${p} has no horizontal scroll`, await noHScroll(page));
          if (p === "/") await page.screenshot({ path: path.join(shots, `proposal-${label}.png`), fullPage: false });
        }
        await page.context().close();
      }

      // Every major application page at phone width, for each role.
      const MOBILE = {
        teacher: ["/app/teacher", "/app/teacher/content", "/app/teacher/questions", "/app/teacher/quizzes", "/app/teacher/quizzes/1", "/app/teacher/performance", "/app/attendance", "/app/exams/5", "/app/teacher/lessons", "/app/teacher/worksheets"],
        office: ["/app/enquiries", "/app/enquiries/1", "/app/knowledge", "/app/students", "/app/students/25", "/app/reports", "/app/tasks", "/app/report-cards/25?exam=5"],
        warden: ["/app/hostel", "/app/hostel/leave", "/app/hostel/rollcall", "/app/hostel/rooms", "/app/hostel/maintenance"],
        management: ["/app/command", "/app/audit"],
        admin: ["/app/users", "/app/system"],
        student: ["/app/learn", "/app/learn/1", "/app/progress", "/app/coding", "/app/coding/py-loops", "/app/coding/robot-loops"],
        parent: ["/app/progress", "/app/report-cards"],
      };
      for (const [role, pages] of Object.entries(MOBILE)) {
        const mp = await newPage(375, 812);
        await mp.goto(`${B}/login`);
        await mp.click(`[data-account="${role}"]`);
        await mp.waitForURL(/\/app$/);
        for (const p of pages) {
          await mp.goto(`${B}${p}`, { waitUntil: "networkidle" });
          check(`mobile ${role}: ${p} has no horizontal scroll`, await noHScroll(mp));
        }
        await mp.screenshot({ path: path.join(shots, `${role}-mobile.png`), fullPage: false });
        await mp.context().close();
      }

      // Student journey in the UI: one-click sign-in, take a quiz, see explanations.
      const page = await newPage(390, 844);
      await page.goto(`${B}/login`);
      await page.click('[data-account="student"]');
      await page.waitForURL(/\/app$/);
      check("UI: student signs in with one click", page.url().endsWith(`${BASE_PATH}/app`));
      await page.screenshot({ path: path.join(shots, "student-dashboard-mobile.png"), fullPage: true });
      check("UI: mobile dashboard has no horizontal scroll", await noHScroll(page));
      await page.click("text=Menu");
      check("UI: mobile menu opens", await page.isVisible('[role="dialog"] >> text=Learn & practise'));
      await page.click('[role="dialog"] >> text=Learn & practise');
      await page.waitForURL(/\/app\/learn$/);
      await page.click("text=Exponents and Powers");
      await page.waitForURL(/\/app\/learn\/\d+$/);
      await page.reload();
      check("UI: refresh on a deep link keeps the page", (await page.textContent("h1"))?.includes("Exponents and Powers"));
      await page.click('a:has-text("Start"), a:has-text("Retake")');
      await page.waitForURL(/\/app\/quiz\/\d+$/);
      const groups = await page.$$("fieldset");
      for (const g of groups) await (await g.$$('input[type="radio"]'))[1].check();
      page.once("dialog", (d) => d.accept());
      await page.click("text=Submit answers");
      await page.waitForSelector('[data-testid="quiz-result"]');
      const resultText = await page.textContent('[data-testid="quiz-result"]');
      check("UI: quiz is marked and shows a score", /\d \/ 5/.test(resultText ?? ""), resultText);
      check("UI: explanations appear after submitting", (await page.locator("text=Correct answer:").count()) + (await page.locator("text=Correct").count()) > 0);
      await page.screenshot({ path: path.join(shots, "quiz-result-mobile.png"), fullPage: true });

      // Robot challenge in the UI.
      await page.goto(`${B}/app/coding/robot-moves`);
      await page.fill("textarea", "forward 3\nright\nforward 2\nleft\nforward 2");
      await page.click("text=Run robot");
      await waitCheck("UI: robot program reaches the goal", page.waitForSelector("text=Goal reached", { timeout: 15000 }));

      // JavaScript challenge runs in a Web Worker.
      await page.goto(`${B}/app/coding/web-js`);
      await page.locator("textarea").first().fill("function isEven(n) {\n  return n % 2 === 0;\n}\n");
      await page.locator("text=Run and check").first().click();
      await waitCheck("UI: JavaScript challenge passes its tests", page.waitForSelector("text=All checks passed", { timeout: 15000 }));
      // Python runs in the browser with Pyodide (downloaded from cdn.jsdelivr.net).
      await page.goto(`${B}/app/coding/py-loops`);
      await page.locator("textarea").first().fill("def total(n):\n    s = 0\n    for i in range(1, n + 1):\n        s = s + i\n    return s\n");
      await page.locator("text=Run and check").first().click();
      await waitCheck("UI: Python challenge runs in the browser and passes", page.waitForSelector("text=All checks passed", { timeout: 90000 }));
      await page.goto(`${B}/app/coding/web-js`);
      await page.locator("textarea").first().fill("function isEven(n) { while (true) {} }");
      await page.locator("text=Run and check").first().click();
      await waitCheck("UI: infinite loop is stopped by the timeout", page.waitForSelector("text=took too long", { timeout: 15000 }));
      await page.context().close();

      // Parent uses the admissions assistant in Hindi and submits an enquiry.
      const p2 = await newPage(1280, 900);
      await p2.goto(`${B}/admissions`);
      await p2.click("text=हिंदी");
      await p2.fill("#assistant-q", "प्रवेश के लिए कौन से दस्तावेज़ चाहिए?");
      await p2.click('button[aria-label="पूछें"]');
      await waitCheck("UI: Hindi question answered in Hindi", p2.waitForSelector("text=जन्म प्रमाण पत्र", { timeout: 15000 }));
      await p2.fill("#e-parent", "UI Parent");
      await p2.fill("#e-phone", "9000000099");
      await p2.fill("#e-child", "UI Child");
      await p2.check('input[name="consent"]');
      await p2.click("text=Submit enquiry");
      await p2.waitForSelector('[data-testid="enquiry-ref"]');
      const ref = await p2.textContent('[data-testid="enquiry-ref"]');
      await p2.fill("#t-ref", ref ?? "");
      await p2.fill("#t-phone", "9000000099");
      await p2.click("button:has-text('Check')");
      await p2.waitForSelector('[data-testid="track-status"]');
      check("UI: enquiry submitted and tracked", (await p2.textContent('[data-testid="track-status"]')) === "New");
      await p2.screenshot({ path: path.join(shots, "admissions-desktop.png"), fullPage: true });

      // Management command centre renders charts with tooltips/table toggle.
      await p2.goto(`${B}/login`);
      await p2.click('[data-account="management"]');
      await p2.waitForURL(/\/app$/);
      await p2.goto(`${B}/app/command`);
      check("UI: command centre renders charts", (await p2.locator('svg[role="img"]').count()) >= 1 && (await p2.locator('ul[role="img"]').count()) >= 2);
      await p2.locator("text=View as table").first().click();
      check("UI: chart table view toggles", (await p2.locator("table").count()) >= 1);
      await p2.screenshot({ path: path.join(shots, "command-centre-desktop.png"), fullPage: true });
      // Warden approves on a tablet.
      await p2.goto(`${B}/login`);
      await p2.click("text=Sign out").catch(() => undefined);
      await p2.context().close();

      check("no JavaScript errors in the browser", consoleErrors.length === 0, consoleErrors.join(" | "));
      await browser.close();
    }
  }

  // Reset (presentation only) restores sample data.
  const admin2 = await as("admin");
  check("presentation data reset works", (await admin2.post("/api/system/reset")).status === 200);
  check("after reset, sample accounts work again", (await fresh().post("/api/auth/presentation-login", { account: "teacher" })).status === 200);
  check("server log has no unexpected errors", !/⨯|Unhandled|TypeError|ReferenceError/.test(serverLog), serverLog.match(/.*(⨯|TypeError|ReferenceError).*/)?.[0]);
} catch (e) {
  check("e2e run completed without crashing", false, e.stack || e);
} finally {
  stop();
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/e2e-report.json", JSON.stringify({ when: new Date().toISOString(), passed: results.filter((r) => r.ok).length, failed: failures, results }, null, 2));
  writeFileSync("test-results/server.log", serverLog);
  console.log(`\n${results.length - failures} passed, ${failures} failed. Report: test-results/e2e-report.json`);
  process.exit(failures ? 1 : 0);
}
