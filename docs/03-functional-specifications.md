# Module functional specifications

This document describes how each module behaves: its screens, business rules and status workflows. The *Feature catalogue* lists the purpose, status and acceptance criteria of each feature; this document is the reference for how the rules work.

## Common rules (all modules)

- **Access:** every screen and every action checks the user's permission on the server. Students and parents can only see their own (child's) records.
- **Validation:** all input is validated on the server (length, format, allowed values). Error messages say what to fix.
- **History:** status changes are written to a history table with the person and time. Important actions are also written to the audit log.
- **Dates and times:** India Standard Time (Asia/Kolkata). School days are Monday to Saturday.
- **Sample data:** in the presentation environment, all records are synthetic and flagged as such.

## A. AI learning platform

| Screen | Path | Who |
|---|---|---|
| Topics by subject | `/app/learn` | Student (own class), teacher, administrator (choose class) |
| Topic page: material, ask a question, quizzes, worksheets | `/app/learn/{topic}` | Same |
| Take a quiz | `/app/quiz/{quiz}` | Student; staff preview (not saved) |
| Progress | `/app/progress` | Student, parent |
| Printable worksheet | `/app/worksheet/{id}` | Student (approved only), teacher |

**Rules**

1. Students see topics, quizzes and worksheets for their class level only.
2. Only *approved* material is shown. Viewing material is recorded as a learning event.
3. **Ask a question**
   1. Input is screened. Messages indicating risk to the child (self-harm, abuse, bullying) return a fixed safety message pointing to a trusted adult and CHILDLINE 1098; the message is neither sent to AI nor stored. Messages containing a phone number or email address are refused with a privacy reminder.
   2. Up to three passages are retrieved from the topic's approved material by keyword relevance.
   3. If AI is configured, the question and passages are sent to the AI model with instructions to explain from the sources, at the student's level, without inventing facts; otherwise the passages are returned with a notice that AI is not configured.
   4. Limits: 20 questions per 10 minutes per user, plus the AI hourly cap (default 30).
4. **Quiz scoring:** answers are sent to the server; each question scores 1 if the chosen option equals the stored correct option, otherwise 0 (unanswered = 0). Score, total and percentage are returned with the correct option and explanation for every question. Student attempts are stored; staff previews are not.
5. **Mastery bands** use the best percentage per topic: no attempts = Not started; below 50% = Needs support; 50–79% = Developing; 80% and above = Secure.

## B. Teacher workspace

| Screen | Path |
|---|---|
| Workspace overview, add topic | `/app/teacher` |
| Learning material (draft / approved / archived) | `/app/teacher/content`, `/app/teacher/content/{id}` |
| Question bank, AI drafting | `/app/teacher/questions`, `/app/teacher/questions/{id}` |
| Quizzes, quiz editor and results | `/app/teacher/quizzes`, `/app/teacher/quizzes/{id}` |
| Worksheets | `/app/teacher/worksheets` |
| Lesson preparation | `/app/teacher/lessons`, `/app/teacher/lessons/{id}` |
| Class performance | `/app/teacher/performance` |

**Scope rule:** a teacher may manage topics, material and questions for subjects they teach at that class level, and quizzes and worksheets for the exact class and subject they teach. Management may approve any material or question. The platform administrator may do everything.

**Material workflow**

```
draft ──approve──▶ approved ──archive──▶ archived ──restore──▶ draft
  ▲                    │
  └──────── edit ──────┘   (any edit returns material to draft)
```

**Question workflow:** `draft → approved → archived`. Questions are drafted by teachers or by AI (`source = ai_draft`). Editing returns a question to draft. Questions already answered by students cannot be edited, and questions used in a published quiz cannot be archived.

**Quiz workflow:** `draft → published → archived`. While draft: title, instructions and questions can be changed (approved questions from the quiz's topic only). Publishing requires at least one question and all questions approved. Published quizzes cannot be edited; *Close quiz* archives them and keeps results.

**Worksheet workflow:** `draft → approved → archived`. Built from approved questions of one topic for one class.

**Lesson plans:** created as draft by AI or template; private to the teacher; the teacher edits and marks *Reviewed*. Generation types are shown on screen: AI draft, Template, Manual.

## C. Admissions and parent assistant

| Screen | Path | Who |
|---|---|---|
| Admissions help (assistant, enquiry form, tracking) | `/admissions` | Public |
| Enquiries list and detail | `/app/enquiries`, `/app/enquiries/{id}` | Office, management |
| Assistant knowledge base | `/app/knowledge` | Office |

**Assistant decision rule**

1. If the question touches a sensitive topic (fees and payments, admission guarantees, health or disability, safety, complaints, welfare), it is escalated with the reason.
2. Otherwise the question is compared with each *published* knowledge-base entry (question text in both languages, category and keywords). Entries matching at least half of the question's meaningful words are used (up to two).
3. If none match, the question is escalated: "not covered by information the school has verified".
4. The answer is the entry's text in the chosen language. If AI is configured, it may be reworded conversationally using only those entries.
5. Every reply shows its source and verification status. Hindi answers not yet reviewed by staff are labelled.
6. Every question is logged (text, language, outcome) without identity. Escalated questions appear on the knowledge-base page for staff to add answers.

**Enquiry workflow**

```
new ──▶ contacted ──▶ visit_scheduled ──▶ application_submitted ──▶ admitted
 │          │  ▲             │                     │
 │          │  └─────────────┘                     │
 └──────────┴──────────────▶ closed ◀──────────────┘   (closed can be reopened to contacted)
```

- New enquiries get a reference `MV-` + 6 characters (no easily confused characters) and a follow-up date of the next day.
- Marking *admitted* requires a note. Admitted and closed enquiries clear their follow-up date.
- Staff can assign an owner (office or management), set a follow-up date, add notes and mark an escalation as handled (with a note).
- Parents track with reference **and** phone number; they see status, next step and dated status history, never staff notes.

## D. School administration

| Screen | Path |
|---|---|
| Student records | `/app/students`, `/app/students/{id}` |
| Attendance | `/app/attendance` |
| Exams and marks | `/app/exams`, `/app/exams/{id}` |
| Report cards | `/app/report-cards`, `/app/report-cards/{student}?exam={id}` |
| Reports | `/app/reports` |
| Tasks | `/app/tasks` |

**Rules**

- Admission numbers are unique; roll numbers are unique among active students in a class. Status: active, inactive (left), alumni.
- Attendance: one status per student per day (present, absent, late, excused); saving again replaces it. Attendance percentage counts *present* and *late* as present.
- Exams: created by the office with a maximum mark per subject; status *open* or *locked*. Marks: 0 to maximum, steps of 0.5; blank means not entered. Locked exams refuse changes until unlocked (audited).
- Report cards: subject marks, grade per subject and overall (default CBSE-style scale A1–E, to be confirmed by the school), attendance up to the exam date, signature lines. Parents and students only see cards for locked exams.
- Reports: computed live from records; downloadable as CSV with formula-injection protection.
- Task workflow: `open → in_progress → done`, `blocked` needs a note, `done` can be reopened. Assignee, creator, management or administrator may update.

## E. Hostel management

| Screen | Path | Who |
|---|---|---|
| Hostel overview | `/app/hostel` | Warden, office, management |
| Leave and outpass | `/app/hostel/leave` | Warden (all), parent and student (own) |
| Roll-call | `/app/hostel/rollcall` | Warden |
| Rooms and beds | `/app/hostel/rooms` | Warden |
| Maintenance | `/app/hostel/maintenance` | Warden (all rooms), boarder (own room) |

**Leave workflow**

```
pending ──approve──▶ approved ──check out──▶ checked_out ──return──▶ returned
   │                    │
   ├──reject (reason)──▶ rejected
   └──cancel (requester, only while pending) / cancel (warden, after approval) ──▶ cancelled
```

- Only boarders; return after departure; outpass within 24 hours; at most 30 days; no overlap with another open request for the same student.
- Times are entered in IST.
- Roll-call pre-marks *on leave* for students with an approved or checked-out request covering that date.

**Maintenance workflow:** `open → in_progress → resolved → closed`; resolved or in-progress items can be reopened; closed is final.

**Beds:** a student has at most one active bed and a bed at most one active student (database constraints). Allocating a student who already has a bed ends the old allocation (a move). Vacating keeps history.

## F. Coding, AI and robotics

- Tracks: Python, Web, AI literacy, Robotics and IoT. Each lesson has one or more challenges.
- **Python:** runs in the browser (Pyodide). Checks compare printed output or the `repr()` of function calls with expected values. 45-second limit per run, including first-time loading.
- **JavaScript:** runs in an isolated web worker; each test calls the named function with arguments and compares the result as JSON; 3-second limit.
- **HTML:** parsed without running scripts; each check requires a minimum number of non-empty elements matching a selector; preview in a sandboxed frame with scripts disabled.
- **Robot:** commands `forward [n]` (1–20), `left`, `right`, `repeat n { … }` (1–50), `#` comments; at most 200 steps (60 for the staircase); errors name the line.
- **AI literacy:** answers graded on the server; answers are not sent to the browser.
- Progress: `attempted` or `passed`; once passed it stays passed.

## G. Management command centre

- Filters: class (all or one) and period (7, 14, 30 school days) in one row above the charts.
- Panels: attendance trend; enquiries by status; lowest-scoring topics; tasks by status and overdue tasks; key figures for attendance, enquiries needing action (new plus follow-ups due, with escalations), average practice-quiz score, hostel status.
- Search: students (name, admission no.), enquiries (parent, child, reference), tasks (title).
- Every chart offers hover values and a table view. Panels are labelled "Sample data" in the presentation environment.
