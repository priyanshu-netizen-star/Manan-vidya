# Presentation script for the VoxVision founder

*Internal document. About 30–35 minutes plus questions. Speak plainly; avoid technical terms unless asked.*

## Before the meeting (checklist)

- [ ] **Reconcile the fee breakdown.** The supplied line items total ₹3,35,000 but the fee and milestones total ₹3,50,000. The proposal currently shows a "₹15,000 not yet allocated" row. Decide how to reconcile it (adjust a line or add one) and update `src/lib/commercial.ts`, then rebuild. Do not present with the unreconciled row unless you intend to discuss it.
- [ ] Open `https://www.voxvision.site/mananvidyademo` on the laptop and a phone; sign in once to warm up.
- [ ] As platform administrator, **Reset presentation data** so the records are clean.
- [ ] Decide whether to show AI live. If an AI key is configured, rehearse the questions below; if not, say so and show the fallback, which is a strength.
- [ ] Have the documentation open at `/mananvidyademo/guide`.
- [ ] Bring a printed copy of the *Executive summary* and *Commercial scope*.

## 1. Opening (2 minutes)

"Thank you for your time. We have built a working proposal for how Manan Vidya could bring learning, teaching, admissions, the office and the hostel into one connected system. Everything you will see works today, but it uses invented sample data only. It is not connected to any of your systems, and nothing goes live without your written approval."

## 2. The big picture (3 minutes): proposal page

Scroll the proposal page: seven modules, who uses each, how they connect.

"The key idea is: enter information once, use it everywhere. A quiz a teacher publishes feeds the student's progress, the teacher's report and your dashboard. A parent's leave request goes to the warden, then into roll-call, then to your summary."

## 3. Student (5 minutes)

Sign in as **Student** (one click). On a phone if possible.

1. Dashboard: quizzes waiting, topic progress.
2. **Learn & practise → Force and Pressure**: approved material, marked "Teacher-approved".
3. **Ask a question**: "Why do school bags have wide straps?"
   - With AI: explanation plus the passages it used.
   - Without AI: "We have not switched AI on; you can see it shows the teacher's material instead and says so. It never pretends."
4. Try: "I am being bullied in the hostel". Show the safety message with CHILDLINE 1098. "This is never sent to AI and never stored. Your safeguarding lead will approve this wording."
5. Take a quiz; get one wrong deliberately; show the explanation.
6. **Coding, AI & robotics → Robotics 1**: run the robot to the star.

## 4. Teacher (6 minutes)

Sign in as **Teacher**.

1. **Question bank**: an AI draft or a teacher draft awaiting review. "Nothing reaches students until a teacher approves it."
2. **Quizzes → New quiz** for Class VIII Force and Pressure; tick questions; **Preview as student**; **Publish**.
3. Open an existing quiz: per-question correctness and the most common wrong answer. "This tells a teacher exactly what to re-teach."
4. **Lesson preparation**: create a plan (AI or template); show it is a draft to edit.
5. **Attendance**: mark two absences in 10 seconds.

## 5. Parent and admissions (6 minutes)

Open **Admissions help** (no sign-in).

1. Ask "Which documents are required for admission?" Show the source and "awaiting school confirmation" label. "We only used your public website. Your office confirms every answer before go-live."
2. Switch to हिंदी and ask "क्या स्कूल में हॉस्टल की सुविधा है?"
3. Ask "What is the fee for Class 5?". It is handed to staff. "It will never guess about fees, guarantees, health or safety."
4. Submit an enquiry with sample details; note the reference; track it.
5. Sign in as **Office**: the new enquiry; move it to Contacted; set a follow-up date. Back on the parent page, track again: the status has changed.

## 6. Hostel (3 minutes)

Sign in as **Parent**: request leave. Sign in as **Warden**: approve, check out. **Roll-call**: the student is pre-marked on leave. "Every decision has a name and time."

## 7. Management (3 minutes)

Sign in as **Principal**: **Command centre**. Filter by class and period; hover a chart; search for "Aarav". "Every number here is labelled sample data. With your approval, this shows your real school."

## 8. Plan and investment (4 minutes)

Proposal page → timeline and investment.

- 12 weeks, four milestones: 40 / 30 / 20 / 10.
- Fixed fee for the described scope; hardware, AI usage, messaging, ERP licences and hosting are separate and listed.
- ERP: "We have not touched your current software. In week one we review it and recommend the simplest safe option. We will not promise an integration until your vendor confirms it is possible."
- Scope, acceptance criteria, support and code ownership are agreed in the contract.

## 9. Close (1 minute)

"What we would like to agree today is a discovery start date and who from your team will be the project lead. Everything else follows the plan you have in front of you."

## Likely questions and honest answers

| Question | Answer |
|---|---|
| Is our data safe? | Each role sees only what it needs; parents only their child; everything is logged. Before any real data, we agree a data-protection plan under the DPDP Act and you approve it. |
| What does AI cost? | Usage is billed by the provider and depends on use. We measure it in the pilot and cap it per user. AI is optional: everything works without it. |
| Will it replace our ERP? | Not necessarily. It can run alongside it. We review your software first and recommend the simplest option. |
| Can students cheat with AI? | The assistant explains from teacher material and guides through methods; quizzes are marked on the server and answers are never sent to the browser. |
| What if a teacher leaves? | Their content stays; the administrator deactivates their account immediately. |
| Who owns the code? | That is agreed in the contract: licence or ownership options. |
| Hindi? | Supported; our Hindi drafts are marked for review by your staff before use. |
| Robotics kits? | The software activities work now. Kits and workshops are a separate decision and cost. |
| Has any school endorsed this? | No. This is our proposal for Manan Vidya specifically, built on your public information. |
