# Feature catalogue

Each feature is described with its purpose, user journey, inputs, outputs, dependencies, implementation status, security requirements, expected benefit and acceptance criteria.

**Status key**

- **Implemented and tested**: works in the application today and is covered by automated tests (see *Testing and acceptance criteria*).
- **Implemented; needs credentials**: the code is complete but only switches on when the school provides an account or key (for example the AI service). Until then the feature behaves in a clearly labelled fallback mode.
- **Needs school approval / integration**: requires the school's decision, verified data or a third-party connection before operational use.

Benefits describe what each feature is designed to make possible. They are not guaranteed outcomes.

---

## A. AI learning platform

### A1. Subject and topic selection
- **Purpose:** let students find learning content for their own class.
- **User journey:** Student signs in → *Learn & practise* → sees subjects and topics for their class → opens a topic.
- **Inputs:** student's class (from their record).
- **Outputs:** list of topics with material count, quiz count and the student's mastery band.
- **Dependencies:** topics set up by teachers.
- **Status:** Implemented and tested.
- **Security:** students see only topics for their own class level (checked on the server).
- **Benefit:** one place to find what to study.
- **Acceptance criteria:** a Class VIII student sees only Class VIII topics; opening another class's topic is refused.

### A2. Teacher-approved learning material
- **Purpose:** give students reliable explanations written or approved by their teachers.
- **User journey:** Student opens a topic → reads the approved material, marked "Teacher-approved" with a date.
- **Inputs:** material written by teachers.
- **Outputs:** formatted reading material.
- **Dependencies:** teachers approve material (B3).
- **Status:** Implemented and tested.
- **Security:** only approved material is shown; any edit returns it to draft. Raw HTML in content is escaped so it cannot run scripts.
- **Benefit:** students revise from trusted content at any time.
- **Acceptance criteria:** draft material is invisible to students; once approved it appears.

### A3. AI-assisted question answering
- **Purpose:** answer a student's question about the topic in simple, step-by-step language.
- **User journey:** Student types a question on the topic page → receives an explanation plus the passages of approved material it was based on.
- **Inputs:** the question (up to 1,000 characters); approved material for that topic.
- **Outputs:** an AI explanation grounded in the material, or, when AI is not configured, the most relevant passages of approved material, clearly labelled as such.
- **Dependencies:** an AI service account (Anthropic Claude API key) for AI explanations. Usage costs are billed by the provider and are not in the fee.
- **Status:** Implemented. The fallback mode is tested; live AI responses need credentials.
- **Security:** child-safety screening before anything is sent to AI; personal details blocked; hourly usage cap per user; questions logged to the student's learning history (first 300 characters) for teacher visibility.
- **Benefit:** help when a teacher is not available, based on what the teacher taught.
- **Acceptance criteria:** with AI off, the answer is labelled "not configured" and shows approved passages; a message about bullying or self-harm returns the safety message (with CHILDLINE 1098) and is not sent to AI or stored; questions on another class's topic are refused.

### A4. Practice quizzes with automatic scoring
- **Purpose:** let students check their understanding with instant feedback.
- **User journey:** Topic page → *Start* → answer multiple-choice questions → *Submit* → see score.
- **Inputs:** the student's answers.
- **Outputs:** score, percentage, and which answers were right or wrong.
- **Dependencies:** published quizzes (B5).
- **Status:** Implemented and tested.
- **Security:** correct answers are never sent to the browser before submission; scoring happens on the server; answers for questions outside the quiz are rejected.
- **Benefit:** immediate feedback and less marking for teachers.
- **Acceptance criteria:** 3 correct answers out of 5 scores 3/5 (60%); unanswered questions count as incorrect; the quiz page source contains no answer key.

### A5. Explanations for incorrect answers
- **Purpose:** turn mistakes into learning.
- **User journey:** After submitting, each question shows the correct answer and a teacher-written explanation.
- **Inputs:** explanation stored with each question.
- **Outputs:** per-question feedback.
- **Status:** Implemented and tested.
- **Acceptance criteria:** every wrong or unanswered question shows the correct option and its explanation after submission only.

### A6. Topic-wise learning history and progress
- **Purpose:** show students (and their parents) what they have mastered.
- **User journey:** *Progress* page → each topic with attempts, best score and band (Not started / Needs support / Developing / Secure); recent attempts.
- **Outputs:** progress table, recent attempts.
- **Status:** Implemented and tested.
- **Security:** a student or parent sees only their own (child's) record.
- **Benefit:** clear next steps for revision.
- **Acceptance criteria:** a new attempt appears immediately; bands follow fixed thresholds (below 50%, 50–79%, 80%+). Bands are descriptive only and never used for automated decisions.

### A7. Teacher-reviewed worksheets and question banks
See B4 and B6.

### A8. Content management for authorised teachers
See B3. Teachers may manage content only for the subjects and classes they teach; management can approve.

---

## B. Teacher workspace

### B1. Class and subject management
- **Purpose:** show each teacher their classes and subjects and let them add topics.
- **User journey:** *Teacher workspace* → classes and subjects; *Add a topic*.
- **Inputs:** teaching assignments (from the office); topic name and summary.
- **Status:** Implemented and tested.
- **Security:** a teacher can add topics only for subjects and class levels they teach.
- **Acceptance criteria:** the workspace lists the teacher's assignments; adding a topic for a subject not taught is refused.

### B2. Lesson preparation assistance
- **Purpose:** save preparation time with a first draft of a lesson plan.
- **User journey:** *Lesson preparation* → choose class, topic, length and focus → a draft opens → teacher edits and marks it *Reviewed*; print if needed.
- **Inputs:** class, topic, minutes, focus; approved material and question bank.
- **Outputs:** a lesson plan (objectives, timed sequence, differentiation, exit check with answers, homework, "teacher to verify" list).
- **Dependencies:** AI service account for AI drafts. Without it, a structured template is built from approved material and the question bank, labelled "Template from approved material".
- **Status:** Implemented. The template mode is tested; AI drafts need credentials.
- **Security:** plans are private to the teacher who created them; all plans start as drafts.
- **Benefit:** faster, more consistent planning.
- **Acceptance criteria:** with AI off a labelled template is created and contains the topic's approved content and exit questions; another teacher cannot open it.

### B3. Learning material authoring and approval
- **Purpose:** keep student-facing content accurate.
- **User journey:** *Learning material* → write (saved as draft) → *Approve* → visible to students. Editing sends it back to draft. Archive and restore are available.
- **Status:** Implemented and tested.
- **Security:** scoped to the teacher's subjects; every change is recorded in the item's history and in the audit log.
- **Acceptance criteria:** draft is invisible to students; approval makes it visible; editing outside one's subjects is refused.

### B4. Question bank
- **Purpose:** build reusable, reviewed multiple-choice questions.
- **User journey:** *Question bank* → write a question (4 options, correct answer, explanation, difficulty) → *Approve*. Filter by topic and status.
- **Status:** Implemented and tested.
- **Security:** duplicate options rejected; questions already answered by students cannot be edited (preserving past results); questions in a published quiz cannot be archived.
- **Acceptance criteria:** draft questions cannot be added to a quiz; approved ones can.

### B5. AI question drafting
- **Purpose:** speed up question writing.
- **User journey:** *Question bank* → *Draft questions with AI* → choose topic, number and difficulty → drafts appear marked "AI draft" → teacher reviews, edits and approves each.
- **Dependencies:** AI service account; at least one approved material for the topic.
- **Status:** Implemented; needs credentials. Without them the form clearly reports that the AI service is not configured and creates nothing.
- **Security:** drafts only from approved material; every draft needs individual approval; structured output is validated (exactly 4 options and a valid answer) before saving.
- **Acceptance criteria:** with AI off, the request returns "not configured" and no questions are created.

### B6. Worksheets
- **Purpose:** printable practice sheets from approved questions.
- **User journey:** *Worksheets* → choose class and topic → select questions → save as draft → *Approve* → appears on the topic page; print with or without the answer key.
- **Status:** Implemented and tested.
- **Acceptance criteria:** only approved questions from the topic can be used; students see only approved worksheets for their class; the answer key is never shown to students.

### B7. Quiz creation, editing, review and publishing
- **Purpose:** assign practice to a class.
- **User journey:** *Quizzes* → *New quiz* (class + topic) → select approved questions → *Preview as student* → *Publish to class*. Published quizzes can be closed; results are kept.
- **Status:** Implemented and tested.
- **Security:** only teachers of that subject and class; publishing requires at least one question, all approved; published quizzes cannot be edited.
- **Acceptance criteria:** after publishing, students of that class see the quiz on the topic page; empty quizzes cannot be published.

### B8. Reviewing quiz performance
- **Purpose:** see how a class did on each question.
- **User journey:** open a published quiz → students attempted, average, percentage correct per question with the most common wrong answer, and each student's latest and best scores; list of students who have not attempted.
- **Status:** Implemented and tested.
- **Acceptance criteria:** a new student attempt appears in the teacher's view immediately.

### B9. Topic-wise performance summaries
- **Purpose:** decide what to re-teach.
- **User journey:** *Class performance* → filter by class → average score per topic (lowest first), students below 50% on any topic, topic summary table; each chart can be viewed as a table.
- **Status:** Implemented and tested.
- **Security:** teachers see only their subjects; management sees all.
- **Acceptance criteria:** figures match stored attempts; described as a prompt for conversation, not a judgement.

---

## C. Admissions and parent assistant

### C1. Configurable school knowledge base
- **Purpose:** the single source of approved admissions answers.
- **User journey:** Office staff → *Assistant knowledge base* → edit question/answer in English and Hindi, keywords, source, verification status, Hindi-reviewed flag, published flag.
- **Inputs:** information from the school.
- **Status:** Implemented and tested. Seeded only with facts from the school's public website, each marked "From the school's public website (awaiting school confirmation)". One conflicting fact (student–teacher ratio) is unpublished until the school confirms it.
- **Dependencies:** **school confirmation of every answer before go-live**; review of Hindi wording by a fluent staff member.
- **Acceptance criteria:** an updated, school-confirmed answer is used by the assistant immediately and shown as "Confirmed by the school".

### C2. English and Hindi support
- **Purpose:** serve families in their preferred language.
- **User journey:** Parent chooses English or हिंदी (or types in Hindi and the language is detected).
- **Status:** Implemented and tested with the seeded content. Hindi translations are VoxVision drafts and are labelled "Hindi translation awaiting school review" until a staff member marks them reviewed.
- **Acceptance criteria:** a Hindi question about the hostel is answered in Hindi with the review notice.

### C3. Admissions and general-information assistant
- **Purpose:** answer common questions at any hour.
- **User journey:** Parent opens the public *Admissions help* page → asks a question or taps a suggested question → receives the answer with its source and verification status.
- **Outputs:** verified answer text; when AI is configured it may be reworded conversationally but may not add facts.
- **Dependencies:** C1 content; optional AI service.
- **Status:** Implemented and tested (knowledge-base mode). AI rewording needs credentials.
- **Security:** rate limited; questions logged without identity; public page carries a presentation notice and is excluded from search engines.
- **Acceptance criteria:** a covered question is answered from the knowledge base; an uncovered question is handed to staff.

### C4. Human escalation for uncertain or sensitive questions
- **Purpose:** never guess on things that matter.
- **Rules:** questions about fees and payments, admission guarantees, health/disability, safety, complaints or welfare, and any question not confidently covered, are handed to staff with a reason. Enquiries whose message contains such topics are flagged "Needs staff reply".
- **Status:** Implemented and tested.
- **Acceptance criteria:** "What is the fee for class 5?" (English or Hindi) is escalated; the enquiry list shows escalated items first.

### C5. Enquiry submission
- **Purpose:** capture interest without losing it.
- **User journey:** Parent fills the enquiry form (parent and child name, mobile, class sought, day/boarding, optional email and question, consent) → receives a reference number such as `MV-7KQ2XD`.
- **Status:** Implemented and tested.
- **Security:** explicit consent required; spam honeypot; 5 submissions per hour per connection; minimal data collected. In the presentation environment the page states that enquiries do not reach the school and asks for sample details only.
- **Dependencies:** **written authorisation from the school before collecting real enquiries**; optional SMS/WhatsApp provider for confirmations (not included).
- **Acceptance criteria:** a valid enquiry returns a reference; missing consent or a filled honeypot is refused.

### C6. Enquiry tracking (parent)
- **Purpose:** let parents check progress without calling.
- **User journey:** enter reference and mobile number → current status, next step and dated history.
- **Security:** needs both reference and phone; staff notes are never shown.
- **Status:** Implemented and tested.

### C7. Enquiry status management and staff follow-up
- **Purpose:** make sure every family gets a timely reply.
- **User journey:** Office → *Enquiries* → views (follow-up due, escalated, unassigned, by status) and search → open an enquiry → update status, set follow-up date, assign owner, add notes, mark escalation handled; full timeline.
- **Workflow:** New → Contacted → Visit/interaction scheduled → Application submitted → Admitted, or Closed at any stage. Invalid jumps are refused; marking Admitted requires a note.
- **Status:** Implemented and tested.
- **Acceptance criteria:** the parent's tracking page reflects each status change; New → Admitted directly is refused.

---

## D. School administration

### D1. Student records
- **Purpose:** one accurate record per student.
- **User journey:** *Student records* → filter by class/status, search → open a record (attendance %, exam totals, learning progress, hostel bed) → edit (office only).
- **Status:** Implemented and tested.
- **Security:** view for staff with `students.read`; edit for office and platform administrator; admission numbers unique; roll numbers unique per class; audit log records which fields changed (not the values).
- **Dependencies:** **real records only after written authorisation and data-protection plan; import from the existing ERP depends on its export capability.**

### D2. Attendance
- **Purpose:** quick daily register with trends.
- **User journey:** *Attendance* → class and date → everyone starts Present, tap exceptions (Absent / Late / Excused) → *Save*; 14-day trend chart alongside.
- **Status:** Implemented and tested.
- **Security:** teachers mark only classes they teach; no future dates; saving again updates the register.
- **Acceptance criteria:** saving 12 entries stores 12; future dates are refused.

### D3. Examination marks
- **Purpose:** collect marks subject by subject.
- **User journey:** *Exams & marks* → exam → subject → enter marks (blank = not entered) → *Save*. Office creates exams and locks them when final.
- **Status:** Implemented and tested.
- **Security:** teachers enter only subjects they teach in that class; marks between 0 and the maximum, at most half marks; locked exams refuse changes; unlocking is audited.

### D4. Report cards
- **Purpose:** printable report cards in minutes.
- **User journey:** *Report cards* → exam → student → print. Parents see their own child's finalised (locked) cards only.
- **Outputs:** subject marks, grades, total and percentage, attendance, signature lines.
- **Status:** Implemented and tested. Grade scale is a CBSE-style default that **the school must confirm**; sample cards are marked "SAMPLE"; open exams are marked "PROVISIONAL".

### D5. Administrative reports
- **Reports:** class strength and boarders; attendance by student (30 days); students below 85% attendance; latest exam results by subject; enquiry pipeline; quiz participation. Each downloads as CSV.
- **Status:** Implemented and tested.
- **Security:** office, management and administrator only; CSV export protects against spreadsheet formula injection; every export is audited.

### D6. Task tracking
- **Purpose:** follow administrative work to completion.
- **User journey:** *Tasks* → create (title, area, priority, assignee, due date) → update status (Open → In progress → Done; Blocked needs a note) → history recorded. Views: my tasks / all tasks.
- **Status:** Implemented and tested.

### D7. Role-based access
See *User roles and permissions*. Every page and API checks permissions on the server. Implemented and tested.

### D8. ERP integration
- **Status:** Needs school approval / integration. Not promised until compatibility is established. See *School ERP integration requirements*.

---

## E. Hostel management

### E1. Room and bed allocation
- **User journey:** Warden → *Rooms & beds* → see every room and bed with occupant → allocate a free bed (moving a student ends the old allocation) or vacate.
- **Status:** Implemented and tested with synthetic records.
- **Security:** one active bed per student and one student per bed (enforced by the database); block rules prevent allocating a bed in the wrong block; only boarders can be allocated.

### E2. Leave and outpass requests
- **User journey:** Parent (or warden on a parent's behalf) → *Leave & outpass* → type, departure and return time, destination, escort, reason → submitted as *Awaiting warden*.
- **Rules:** return after departure; outpass within the same day; maximum 30 days; no overlapping open requests; boarders only. Parents can cancel only while pending.
- **Status:** Implemented and tested.

### E3. Approval and rejection
- **User journey:** Warden sees pending requests first → *Approve* or *Reject* with a reason (required, shown to the parent) → *Check out* → *Mark returned*.
- **Status:** Implemented and tested. Decisions are always made by a person; nothing is automatic.

### E4. Hostel attendance (roll-call)
- **User journey:** Warden → *Roll-call* → date and morning/night → boarders listed by room; those with approved leave pre-marked *On leave* → mark absentees → *Save*. If anyone is absent, the screen reminds the warden to follow the school's missing-student procedure.
- **Status:** Implemented and tested.

### E5. Maintenance requests
- **User journey:** Boarder (for their own room) or warden raises a request (category, description, priority) → warden updates status and who is handling it.
- **Workflow:** Open → In progress → Resolved → Closed (reopen allowed before closing).
- **Status:** Implemented and tested.

### E6. Request status history and operational summaries
- Every leave and maintenance change is recorded with who and when. *Hostel overview* shows boarders, beds, requests awaiting decision, students out now, open repairs, occupancy by block and the last roll-call.
- **Status:** Implemented and tested.

---

## F. AI, coding and robotics learning

### F1. Structured coding lessons (Python and web)
- Lessons with worked examples; challenges are checked automatically in the browser. Python runs with Pyodide (loaded from cdn.jsdelivr.net), JavaScript in an isolated web worker with a time limit, HTML checked by structure and previewed in a sandbox.
- **Status:** Implemented and tested. Student code never runs on the server.

### F2. AI-literacy content
- Lessons on what AI is, how it learns, privacy, honesty and bias, with checks graded on the server (answers are never sent to the browser).
- **Status:** Implemented and tested.

### F3. Interactive coding challenges
- Run and check, hints, reset, and saved progress. Results checked in the browser are recorded as "client tests": they support learning and are not formal assessment.
- **Status:** Implemented and tested.

### F4. Robotics and IoT modules
- A virtual grid robot programmed with `forward`, `left`, `right` and `repeat`; an IoT sensor-logic challenge (smart fan controller).
- **Status:** Implemented and tested in software. **Physical kits, sensors and workshops are not included and need separate approval.**

### F5. Student project briefs
- Five briefs (marks analyser, club website, AI-mistake investigation, line-following robot, smart fan); hardware needs are listed explicitly.
- **Status:** Implemented.

### F6. Activity progress tracking
- Per-lesson completion on the *Coding, AI & robotics* page.
- **Status:** Implemented and tested.

---

## G. Management command centre

### G1. Dashboards and charts
- Attendance trend, enquiries by status, lowest-scoring topics, tasks by status with overdue list; key figures for attendance, enquiries needing action, average quiz score and hostel status.
- Filters for class and period (7, 14 or 30 days) in one row above the charts; every chart has hover read-outs and a *View as table* option.
- **Status:** Implemented and tested.

### G2. Searchable records
- One search across students, enquiries and tasks.
- **Status:** Implemented and tested.

### G3. Data honesty
- In the presentation environment every panel is labelled "Sample data" and figures come from synthetic records. Real figures appear only after the school authorises integration of its data. No statistics are invented.

---

## H. Platform

### H1. Users and roles
Create accounts, assign roles, deactivate (signs the user out immediately), reset passwords; the last platform administrator cannot be removed. Implemented and tested.

### H2. Audit log
Every sign-in, change, decision and export with who, when and which record. Personal data is not copied into the log. Implemented and tested.

### H3. System status and go-live checklist
Shows environment, database type, AI status and a readiness checklist (production mode, hosted database, sample data removed, admissions answers confirmed, Hindi reviewed). Implemented.

### H4. Presentation data reset
Restores the synthetic records; available only in the presentation environment to the platform administrator. Implemented and tested.
