# Testing and acceptance criteria

## 1. How the system is tested

| Layer | Tool | What it covers | Command |
|---|---|---|---|
| Static checks | TypeScript (strict), ESLint (Next.js rules) | Type safety, React and accessibility rules | `npm run typecheck`, `npm run lint` |
| Unit and database tests | Vitest with embedded PostgreSQL | Quiz scoring, commercial totals, workflow rules, assistant decisions, safety screening, retrieval, robot interpreter, permissions, Markdown escaping, CSV safety, password hashing, seed data integrity | `npm test` |
| End-to-end tests | Production build + real HTTP requests + real Chrome (Playwright Core) | Routing under the subpath, page access for every role, security boundaries, complete user journeys, browser interaction, responsive layout | `npm run build && npm run test:e2e` |
| Live AI check | `scripts/ai-check.mjs` against a running server with an AI key | Each AI feature end to end, printing the answers for a person to judge; safety and fee escalation still bypass AI | `npm run test:ai` (spends AI usage) |
| Integration with the main site | Patched copy of the existing VoxVision site proxying to School OS | Existing pages unaffected; subpath, assets, redirects, cookies and CSRF through the proxy | Manual procedure in section 4 |

The end-to-end suite starts the production server on a fresh in-memory database each run, with AI deliberately **not** configured, so it tests the honest fallback behaviour. It writes `test-results/e2e-report.json`, the server log, and screenshots to `test-results/screens/`.

## 2. Latest results (presentation build, 27 October 2026)

| Suite | Passed | Failed |
|---|---:|---:|
| TypeScript and ESLint | clean | 0 |
| Unit and database tests | 47 | 0 |
| End-to-end: A. Routing and subpath | 19 | 0 |
| End-to-end: B. Page access by role (7 roles) | 115 | 0 |
| End-to-end: C. Security boundaries | 29 | 0 |
| End-to-end: D. User journeys and workflows | 93 | 0 |
| End-to-end: E1. Browser user journeys (Chrome) | 15 | 0 |
| End-to-end: E2. Responsive layout at 375, 768 and 1366 px | 47 | 0 |
| **End-to-end total** | **318** | **0** |

Issues found by these tests during development and fixed before this run included: a horizontal overflow on the proposal header at tablet width; wide tables stretching cards on phones (11 pages); an invalid phone-number pattern rejected by modern browsers; and a server/client component boundary error on three forms.

**Not covered by automated tests (and why):**

- Live AI with Claude: no Anthropic key was available. The Claude code is type-checked against the official SDK; it must be checked with `npm run test:ai` once a key is provided.
- Quality of AI answers: the live check (below) proves the features work, not that every answer is right. Teachers must review answers to an agreed set of questions per topic (section 5).
- Production hosting, hosted PostgreSQL and the live `www.voxvision.site` rewrite: these need hosting access. The same configuration was verified locally (section 4).
- Assistive-technology testing with screen readers, and testing on physical low-end phones: planned for user acceptance testing.

### Live AI check with Google Gemini (27 October 2026)

Run with a Gemini free-tier key, `gemini-2.5-flash`, sample data on a throwaway database: **10 passed, 0 failed.**

| Check | Result |
|---|---|
| Learning assistant answers an English question from approved material | Pass (about 3 s) |
| Learning assistant answers a Hindi question in Hindi | Pass (about 2 s) |
| Wellbeing message goes to the CHILDLINE 1098 safety response, not AI | Pass |
| AI drafts 3 questions, saved as drafts for teacher review | Pass (about 2–6 s) |
| Lesson preparation produces a draft labelled "Drafted by AI · Needs your review" | Pass (about 5–18 s) |
| Admissions assistant rewords verified facts in English and in Hindi | Pass (about 2 s) |
| Fee question still escalated to staff, not answered | Pass |

Problems this check found and fixed:
- The admissions answer called the school "VoxVision School": the prompt now names the school and says VoxVision is the vendor.
- Hindi questions to the learning assistant found no material, because keyword search matches English words: the topic's approved material is now supplied when nothing matches.

Google's free tier was sometimes busy: some models returned "busy" (503), and one request took almost 5 minutes. The code retries and then moves to the models in `GEMINI_FALLBACK_MODELS`; if all fail, users see the non-AI fallback with an honest message.

## 3. What the end-to-end tests verify (selected)

**Subpath and routing:** every public page loads under `/mananvidyademo`; the bare subpath serves the proposal; paths outside it are not served; protected pages redirect to sign-in; deep links survive a browser refresh; internal documents are not served; security headers present; no `X-Powered-By`.

**Security boundaries:**
- Changes without an `Origin` header, or from a foreign origin, are refused.
- Unauthenticated calls are refused.
- Students cannot call staff APIs, create users, approve material or change marks.
- Quiz pages contain no answer key.
- Students cannot open or submit another class's quiz.
- Parents cannot open another child's report card or a provisional one.
- Teachers cannot edit other subjects' content or enter marks for subjects they do not teach.
- AI-literacy answers are not sent to the browser.
- Wrong passwords get a generic error, and the session cookie is HttpOnly, SameSite=Lax and scoped to the subpath.
- Sign-out invalidates the session, and accounts lock after five failed sign-ins.

**Quiz scoring:**
- 3 correct, 1 wrong and 1 unanswered out of 5 scores exactly 3/5 (60%).
- The wrong answer shows the correct option.
- An unanswered question counts as wrong.
- Explanations are returned only after submission.
- All correct scores 5/5.
- An answer to a question outside the quiz is rejected.

**Teacher-to-student loop:**
- A teacher writes and approves a question and creates a quiz.
- Publishing an empty quiz is refused, and an unapproved question cannot be added.
- The teacher publishes the quiz, and a published quiz cannot be edited.
- The student sees the quiz and scores 2/2, and the teacher sees that result.
- Draft material is invisible to students until it is approved.

**AI honesty:**
- With no AI key, the learning assistant returns approved passages with a "not configured" notice.
- Question drafting returns "not configured" and creates nothing.
- Lesson preparation returns a labelled template.
- A wellbeing message returns the CHILDLINE 1098 safety message.

**Admissions:**
- Answers for covered questions come from the knowledge base and carry a verification label.
- Hindi answers show the translation-review notice.
- Fee questions are escalated, and so is an unpublished, conflicting fact.
- An enquiry returns a reference; missing consent and a filled honeypot are refused.
- Tracking needs the phone number and never exposes staff notes.
- An invalid status jump is refused; valid steps show up in the parent's tracking history.
- A school-confirmed answer update is used immediately.

**Hostel:**
- Overlapping requests are refused, and so is a return before departure.
- A parent cannot approve; a warden must give a reason to reject.
- The full approve → check-out → return cycle works, and is visible to the parent with the warden's name.
- Roll-call saves and refuses non-boarders; leave for non-boarders is refused.
- A boarder's maintenance request flows to the warden, and invalid transitions are refused.

**Administration:**
- A register of 12 students saves; future dates are refused, and so are students from another class.
- Marks save, and the provisional report card shows them; marks above the maximum are refused, and so are changes to a locked exam.
- A final report card shows grades and the SAMPLE marking.
- Task workflow works, including the note required for "blocked".
- The CSV report downloads; students cannot download reports.
- Duplicate admission numbers are refused.

**Management and platform:**
- The command centre shows the sample-data labelling, and its search finds a student.
- Weak passwords are refused.
- A new account can sign in and is blocked once deactivated; administrators cannot deactivate themselves.
- The audit log shows quiz publication and leave approval.
- Presentation reset works.

**Browser:**
- One-click sign-in, the mobile menu, refresh on a deep link, and taking a quiz through the UI with explanations.
- The robot reaches its goal; a JavaScript challenge passes, and an infinite loop is stopped by the timeout.
- Python runs in the browser and passes its checks.
- A Hindi question gets a Hindi answer; an enquiry is submitted and tracked.
- Command-centre charts render and the table view toggles.
- No JavaScript errors in the browser.

## 4. Main-site integration test (performed 27 October 2026)

A copy of the existing VoxVision site (`voxvision-new`) was patched with `deploy/main-site/next.config.patch`, built with `SCHOOL_OS_ORIGIN` pointing at a running School OS build, and served alongside it. The original repository was not modified.

| Check | Result |
|---|---|
| Existing pages `/`, `/privacy`, `/terms`, `/admin`, `/solutions/agriculture`, `/solutions/automotive`, `/robots.txt`, `/sitemap.xml` | 200 (unchanged) |
| `/mananvidyademo`, `/login`, `/admissions`, `/guide/user-manuals` via the main site | 200 |
| School OS static assets via the main site | 200 |
| Signed-out `/mananvidyademo/app` | Redirects to the main-site address `/mananvidyademo/login` |
| Sign-in through the proxy | Cookie set for `Path=/mananvidyademo`, HttpOnly, SameSite=Lax |
| Creating a task through the proxy (Origin = main site) | Succeeds |
| Same request from a foreign origin | Refused ("Cross-origin request blocked") |
| Browser: sign in, refresh deep link, take a quiz through the main-site address | Works; no failed requests or script errors |

## 5. Acceptance criteria for the school (user acceptance testing)

The school signs off each milestone when the criteria below are met on the school's own environment. Criteria are finalised during discovery.

### AI learning platform and teacher workspace (core pilot review)
1. Pilot teachers can add or approve material, write and approve questions, build and publish a quiz, and see per-question results.
2. A pilot student can study a topic, ask a question, take a quiz, see explanations and see progress, on a phone and a computer.
3. Students cannot see unapproved content or other classes' quizzes.
4. If AI is enabled: teachers review answers to an agreed set of test questions per topic and approve the quality; safety messages are confirmed by the safeguarding lead.
5. Lesson preparation produces a draft that teachers can edit, review and print.

### Admissions assistant (core pilot review)
6. Every published answer is marked "Confirmed by the school"; every Hindi answer is reviewed.
7. Fee, guarantee, health and safety questions are escalated; an agreed list of 20 typical questions is answered correctly or escalated.
8. An enquiry can be submitted, tracked by the parent and worked to completion by the office, with every step on the timeline.

### Administration (module review)
9. Student import (if agreed) matches the source export (counts and spot checks).
10. A class register, a full marks entry for one exam, exam locking and report-card printing work with the school's grade scale and layout.
11. Each report matches a manual calculation for a sample class.
12. Each role sees only what the permission matrix allows (spot checks by the school).

### Hostel (module review)
13. A parent's leave request is approved, checked out and returned by the warden; roll-call pre-marks the student as on leave.
14. Bed allocation prevents double-booking; maintenance requests flow to resolution.

### Handover
15. All automated tests pass on the production build; go-live checklist on the System page is complete; backups restored successfully once.
16. Training delivered to each role; documentation handed over.

## 6. Defect classification during acceptance

| Priority | Meaning | Target |
|---|---|---|
| P1 | Data loss, security issue, or a core workflow blocked | Fix before sign-off |
| P2 | Workflow works with difficulty or a workaround | Fix before sign-off or agreed date |
| P3 | Cosmetic or minor | Scheduled during support |
