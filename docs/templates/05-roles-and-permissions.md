# User roles and permissions

VoxVision School OS gives each person only the access their job needs. Roles and permissions are defined in one place in the code (`src/lib/rbac.ts`) and checked **on the server** for every page and every action. Hiding a menu item is a convenience; it is never the security control.

## The seven roles

| Role | Who | Typical work |
|---|---|---|
| Student | Each student (Class VI and above recommended) | Learn topics, ask questions, take quizzes, coding activities, own progress, own hostel requests (boarders) |
| Parent / Guardian | One account per parent, linked to their child | Child's progress and finalised report cards, leave and outpass requests |
| Teacher | Teaching staff | Content, question bank, quizzes, worksheets, lesson plans, class performance, attendance, marks |
| Office & Admissions Staff | Office staff, admission counsellor | Enquiries, assistant knowledge base, student records, exams, reports, tasks |
| Hostel Warden | Boys' and girls' hostel wardens | Rooms and beds, leave approvals, roll-call, maintenance |
| Principal / Management | Principal, chairman, management | Command centre, reports, approvals, audit log |
| VoxVision Platform Administrator | VoxVision support during implementation and support, or the school's IT administrator after handover | User accounts, configuration, all functions |

## Permission matrix

Generated from the code with `npx tsx scripts/doc-tables.ts permissions`.

{{PERMISSIONS_TABLE}}

## Data-scope rules (in addition to permissions)

| Rule | Where it applies |
|---|---|
| A student sees topics, quizzes and worksheets only for their own class level | Learning platform |
| A student or parent sees only their own (child's) progress, report cards and hostel requests | Progress, report cards, leave |
| Parents and students see report cards only for **locked** (final) exams | Report cards |
| A teacher manages topics, material and questions only for subjects they teach at that class level | Teacher workspace |
| A teacher manages quizzes and worksheets only for the exact class and subject they teach | Quizzes, worksheets |
| A teacher marks attendance only for classes they teach, and enters marks only for subjects they teach in that class | Attendance, exams |
| Lesson plans are private to the teacher who created them | Lesson preparation |
| A boarder raises maintenance requests only for their own room | Hostel |
| A requester can only cancel their own request while it is still pending; only the warden decides | Leave and outpass |
| Task updates: assignee, creator, management or administrator | Tasks |
| The last active platform administrator cannot be deactivated or demoted; nobody can change their own role | Users |

## Human decisions

The system never decides automatically on admissions, discipline, student welfare or hostel requests. Each such decision is recorded against a named staff member:

- Enquiry status changes: office or management staff.
- Leave and outpass: the warden (approve, reject with a reason, check out, return).
- Content shown to students: a teacher (or management) approves it.
- Exam results: the office locks the exam to make report cards final.

## Account lifecycle

1. The platform administrator creates the account with an initial password (at least 10 characters, letters and numbers) and shares it securely.
2. Student and parent accounts must be linked to a student record.
3. Changing a role, resetting a password or deactivating an account signs that person out everywhere immediately.
4. Five wrong passwords lock the account for 15 minutes.
5. Before go-live, sample accounts (`*@school-os.example`) are removed or deactivated (see the deployment guide).
