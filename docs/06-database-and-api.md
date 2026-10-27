# Database and API documentation

*Internal document: provided to the school's IT contact on request.*

## Database

PostgreSQL 14 or later (any managed provider, for example Supabase, Neon or Amazon RDS). The schema is in `src/lib/schema.ts` and is applied idempotently (`CREATE TABLE IF NOT EXISTS`) at start-up and by `npm run db:migrate`. All queries are parameterised.

**Value conventions:** dates are `DATE` (YYYY-MM-DD, IST); timestamps are `TIMESTAMPTZ` (returned as ISO strings); counts and numerics are returned as numbers. Tables holding operational records have a `seeded` flag that marks synthetic presentation rows.

### Tables

| Area | Table | Purpose | Key constraints |
|---|---|---|---|
| People | `classes` | Class and section per academic year | unique (level, section, year) |
| | `students` | Student record | unique admission_no; status active/inactive/alumni |
| | `users` | Accounts and roles | unique email; role check; failed-login counter and lock |
| | `sessions` | Sign-in sessions (SHA-256 of token) | expiry; cascade on user delete |
| | `subjects` | Subjects | unique name and code |
| | `teaching_assignments` | Teacher × class × subject | unique triple |
| Learning | `topics` | Topics per subject and class level | unique (subject, level, name) |
| | `materials` | Learning material | status draft/approved/archived |
| | `questions` | Multiple-choice questions | options JSON (4); correct_index; status; source teacher/ai_draft |
| | `quizzes`, `quiz_questions` | Quizzes and their ordered questions | status draft/published/archived |
| | `quiz_attempts` | Student answers and score | answers JSON |
| | `worksheets` | Printable worksheets | question_ids JSON; status |
| | `lesson_plans` | Teacher lesson plans | generation manual/template/ai; status draft/reviewed |
| | `learning_events` | Material views, questions asked, attempts, coding progress | |
| Administration | `attendance` | Daily class attendance | unique (student, date) |
| | `exams`, `marks` | Exams and subject marks | marks unique (exam, student, subject); exam open/locked |
| | `tasks` | Administrative tasks | status open/in_progress/blocked/done |
| Admissions | `kb_entries` | Assistant knowledge base (English and Hindi) | verification public_source/pending_school/school_confirmed; published |
| | `enquiries` | Admission enquiries | unique ref_code; status workflow; consent |
| | `assistant_logs` | Questions asked to the assistant (no identity) | mode knowledge_base/ai/escalated |
| Hostel | `hostel_rooms`, `hostel_beds` | Rooms and beds | unique (block, room), (room, label) |
| | `bed_allocations` | Bed history | partial unique indexes: one active allocation per bed and per student |
| | `leave_requests` | Leave and outpass | status workflow |
| | `hostel_attendance` | Roll-call | unique (student, date, session) |
| | `maintenance_requests` | Repairs | status workflow |
| Coding | `coding_lessons`, `coding_challenges`, `coding_progress`, `projects` | Lessons, challenges, progress, briefs | progress unique (student, challenge) |
| Accountability | `status_history` | Every status change (entity, from, to, note, actor) | |
| | `audit_log` | Actions with actor, record reference and IP | |

### Backups

Use the provider's automated daily backups with point-in-time recovery (at least 7 days; 30 recommended). Test a restore before go-live and every term. See the deployment guide.

## API

All endpoints are under `/mananvidyademo/api`, accept and return JSON, and are implemented as Next.js route handlers wrapped by `route()` in `src/lib/http.ts`, which:

- refuses state-changing requests (POST, PATCH, DELETE) whose `Origin` does not match the host or `ALLOWED_ORIGINS` (HTTP 403);
- limits request bodies to 64 KB (413);
- validates bodies with Zod (400 with a field-specific message);
- returns `{ "error": "…" }` with an appropriate status for expected errors, and a generic message with 500 for unexpected ones (details in server logs only).

Authentication uses the `mv_session` cookie. "Access" is the permission required (see *User roles and permissions*); handlers additionally apply the data-scope rules.

Generated from the code with `npx tsx scripts/doc-tables.ts api`.

| Method | Path | Access | Rate limit |
|---|---|---|---|
| POST | `/mananvidyademo/api/assistant` | public | 30 per 10 min |
| POST | `/mananvidyademo/api/attendance` | `attendance.mark` | — |
| POST | `/mananvidyademo/api/auth/login` | public | 10 per 10 min |
| POST | `/mananvidyademo/api/auth/logout` | public | — |
| POST | `/mananvidyademo/api/auth/presentation-login` | public | 60 per 10 min |
| POST | `/mananvidyademo/api/coding/check` | `coding.use` | 30 per 10 min |
| POST | `/mananvidyademo/api/coding/progress` | `coding.use` | 60 per 10 min |
| PATCH | `/mananvidyademo/api/enquiries/[id]` | `enquiry.manage` | — |
| POST | `/mananvidyademo/api/enquiries` | public | 5 per 60 min |
| POST | `/mananvidyademo/api/enquiries/track` | public | 10 per 10 min |
| POST | `/mananvidyademo/api/exams/[id]/marks` | `marks.enter` | — |
| PATCH | `/mananvidyademo/api/exams/[id]` | `exams.manage` | — |
| POST | `/mananvidyademo/api/exams` | `exams.manage` | — |
| DELETE | `/mananvidyademo/api/hostel/allocations/[id]` | `hostel.manage` | — |
| POST | `/mananvidyademo/api/hostel/allocations` | `hostel.manage` | — |
| PATCH | `/mananvidyademo/api/hostel/leave/[id]` | signed in (checked in handler) | — |
| POST | `/mananvidyademo/api/hostel/leave` | signed in (checked in handler) | — |
| PATCH | `/mananvidyademo/api/hostel/maintenance/[id]` | `hostel.manage` | — |
| POST | `/mananvidyademo/api/hostel/maintenance` | signed in (checked in handler) | — |
| POST | `/mananvidyademo/api/hostel/rollcall` | `hostel.manage` | — |
| PATCH | `/mananvidyademo/api/kb/[id]` | `kb.manage` | — |
| POST | `/mananvidyademo/api/kb` | `kb.manage` | — |
| POST | `/mananvidyademo/api/learn/ask` | `learning.use` | 20 per 10 min |
| PATCH | `/mananvidyademo/api/lessons/[id]` | `ai.teacher_tools` | — |
| DELETE | `/mananvidyademo/api/lessons/[id]` | `ai.teacher_tools` | — |
| POST | `/mananvidyademo/api/lessons` | `ai.teacher_tools` | 10 per 10 min |
| PATCH | `/mananvidyademo/api/materials/[id]` | signed in (checked in handler) | — |
| POST | `/mananvidyademo/api/materials` | `content.manage` | — |
| PATCH | `/mananvidyademo/api/questions/[id]` | signed in (checked in handler) | — |
| POST | `/mananvidyademo/api/questions/ai-draft` | `ai.teacher_tools` | 10 per 10 min |
| POST | `/mananvidyademo/api/questions` | `content.manage` | — |
| POST | `/mananvidyademo/api/quizzes/[id]/attempt` | `learning.use` | 30 per 10 min |
| PATCH | `/mananvidyademo/api/quizzes/[id]` | `quiz.manage` | — |
| POST | `/mananvidyademo/api/quizzes` | `quiz.manage` | — |
| GET | `/mananvidyademo/api/reports/[name]` | `reports.view` | — |
| PATCH | `/mananvidyademo/api/students/[id]` | `students.write` | — |
| POST | `/mananvidyademo/api/students` | `students.write` | — |
| POST | `/mananvidyademo/api/system/reset` | `system.reset` | 3 per 10 min |
| PATCH | `/mananvidyademo/api/tasks/[id]` | `tasks.manage` | — |
| POST | `/mananvidyademo/api/tasks` | `tasks.manage` | — |
| POST | `/mananvidyademo/api/topics` | `content.manage` | — |
| PATCH | `/mananvidyademo/api/users/[id]` | `users.manage` | — |
| POST | `/mananvidyademo/api/users` | `users.manage` | — |
| PATCH | `/mananvidyademo/api/worksheets/[id]` | `content.manage` | — |
| POST | `/mananvidyademo/api/worksheets` | `content.manage` | — |

### Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success / created (`{ "id": … }` for created records) |
| 400 | Invalid input (the message names the field) |
| 401 | Not signed in, or wrong credentials |
| 403 | Not permitted, or cross-site request refused |
| 404 | Record not found or not visible to this user |
| 409 | Conflicts with current state (invalid transition, duplicate, locked exam) |
| 413 | Request body too large |
| 429 | Rate limit reached |
| 503 | AI service not configured or unavailable (AI question drafting) |

### Examples

Submit a quiz:

```http
POST /mananvidyademo/api/quizzes/12/attempt
Origin: https://www.voxvision.site
Content-Type: application/json
Cookie: mv_session=…

{ "answers": { "41": 2, "42": 0, "43": null } }
```

```json
{ "attemptId": 391, "saved": true, "score": 1, "total": 3, "percent": 33,
  "results": [ { "questionId": 41, "chosen": 2, "correctIndex": 2, "isCorrect": true } ],
  "explanations": { "41": "…", "42": "…", "43": "…" } }
```

Move an enquiry forward:

```http
PATCH /mananvidyademo/api/enquiries/57
{ "action": "status", "to": "contacted", "note": "Called parent, shared process" }
```

Ask the admissions assistant:

```http
POST /mananvidyademo/api/assistant
{ "question": "क्या स्कूल में हॉस्टल की सुविधा है?", "lang": "auto" }
```

```json
{ "mode": "knowledge_base", "lang": "hi", "answer": "हाँ। …",
  "sources": [ { "verification": "From the school's public website (awaiting school confirmation)", "translationPending": true } ] }
```
