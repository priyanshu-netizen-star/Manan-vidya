import Link from "next/link";
import {
  ArrowRight, BookOpenCheck, Building2, CalendarClock, ClipboardCheck, Code2, GraduationCap, LayoutDashboard,
  MessagesSquare, ShieldCheck, Users, BedDouble, FileText, CircleAlert,
} from "lucide-react";
import { ProductMark } from "@/components/Logo";
import {
  BUDGET_LINES, DURATION_WEEKS, EXCLUSIONS, MILESTONES, PROJECT_FEE, TIMELINE, UNALLOCATED_NOTE,
  formatINR, milestoneTotal, unallocatedAmount,
} from "@/lib/commercial";
import { PRODUCT, SCHOOL } from "@/lib/config";

export const metadata = { title: { absolute: "VoxVision School OS · Proposed solution for Manan Vidya" } };

const MODULES = [
  {
    icon: GraduationCap, name: "AI learning platform", fee: "AI-powered learning pilot",
    what: "Students choose a subject and topic, read material their teachers have approved, ask questions and get step-by-step explanations, take practice quizzes that are marked instantly, and see which topics they have mastered.",
    who: "Students; parents can see their own child's progress.",
    helps: "Practice and feedback whenever a student studies, not only in class. Teachers see where a class is struggling.",
    status: "Working: topics, approved material, quizzes, instant marking, explanations, progress. AI explanations switch on once the school's AI account is connected.",
  },
  {
    icon: BookOpenCheck, name: "Teacher workspace", fee: "AI-powered learning pilot",
    what: "Teachers manage classes and subjects, write or approve learning material, build question banks, worksheets and quizzes, publish them to a class, and review results topic by topic. An AI assistant can draft lesson plans and questions, which the teacher always reviews first.",
    who: "Teachers; the principal can approve and review.",
    helps: "Less time on preparation and marking; clear evidence of which topics need re-teaching.",
    status: "Working: content, question bank, worksheets, quizzes, publishing, performance views. AI drafting needs the AI account.",
  },
  {
    icon: MessagesSquare, name: "Admissions and parent assistant", fee: "AI admissions assistant and lead tracking",
    what: "Parents ask questions in English or Hindi and get answers taken only from information the school has approved. Anything about fees, guarantees, health or safety, or anything it is not sure about, is handed to a staff member. Parents can leave an enquiry and track it with a reference number.",
    who: "Parents (public page); office and admissions staff.",
    helps: "Parents get answers at any hour; no enquiry is lost; staff see every follow-up due.",
    status: "Working: bilingual knowledge base, escalation to staff, enquiry form, tracking, staff follow-up workflow. School must confirm every answer and the Hindi wording before use.",
  },
  {
    icon: ClipboardCheck, name: "School administration workflows", fee: "ERP workflow and administration automation",
    what: "Student records, daily attendance, examination marks and printable report cards, task tracking for staff, administrative reports, and role-based access so each person sees only what their job needs.",
    who: "Office staff, class teachers, principal and management.",
    helps: "One accurate record instead of registers and spreadsheets; report cards in minutes.",
    status: "Working in the application. Connecting to the school's existing ERP is only possible after we review it and the vendor confirms access.",
  },
  {
    icon: BedDouble, name: "Hostel management", fee: "Digital hostel management",
    what: "Room and bed allocation, leave and outpass requests from parents with warden approval, morning and night roll-call, maintenance requests, and a full history of every request.",
    who: "Wardens, parents of boarders, management.",
    helps: "Wardens always know who is on campus; parents get a clear answer; nothing depends on a paper slip.",
    status: "Working with sample records. Real hostel data only after the school authorises it.",
  },
  {
    icon: Code2, name: "AI, coding and robotics learning", fee: "Part of the learning platform",
    what: "Structured lessons and interactive challenges in Python and web development, AI-literacy lessons on using AI safely, and a virtual robot and IoT simulator that students program, with project briefs for each track.",
    who: "Students and computer teachers.",
    helps: "Hands-on future skills from Class VI onwards, without needing hardware to start.",
    status: "Working in software. Robotics kits, sensors and workshops need separate approval and are not in the fee.",
  },
  {
    icon: LayoutDashboard, name: "Management command centre", fee: "Included across modules",
    what: "One screen for the principal and management: enquiry pipeline, attendance trends, quiz performance by topic, hostel status, open tasks, and a search across records.",
    who: "Principal, chairman and management.",
    helps: "Decisions based on up-to-date numbers rather than asking each department.",
    status: "Working. It shows sample data now and real data only after authorised integration.",
  },
];

const FLOWS = [
  { title: "Learning loop", steps: ["Teacher approves material and publishes a quiz", "Student studies, asks questions, takes the quiz", "Marks and explanations appear instantly", "Teacher sees topic-wise results", "Management sees performance trends"] },
  { title: "Admissions loop", steps: ["Parent asks the assistant (English or Hindi)", "Verified answer, or hand-off to staff", "Enquiry gets a reference number", "Staff follow up and update status", "Management sees the enquiry pipeline"] },
  { title: "Hostel loop", steps: ["Parent requests leave or outpass", "Warden approves or rejects with a note", "Check-out and return are recorded", "Roll-call shows who is on leave", "Management sees hostel status"] },
  { title: "Records loop", steps: ["Teachers mark attendance and enter marks", "Office keeps student records", "Report cards are generated and printed", "Parents see their own child only", "Management sees attendance and results"] },
];

const SCHOOL_INPUTS = [
  "Confirm every admissions answer, fee policy and Hindi wording before the assistant goes live.",
  "Share details of the current ERP or software so we can check whether it can connect (vendor approval may be needed).",
  "Written authorisation before any real student, parent or staff data is entered or imported.",
  "Approve learning material and question banks for pilot classes (teachers stay in charge of content).",
  "Open an AI service account (usage is billed separately by the provider) if AI features are wanted.",
  "Choose hosting and database plans, and any SMS or WhatsApp provider for notifications.",
  "Name staff for each role, take part in training and user acceptance testing.",
  "Decide on robotics hardware separately if physical kits are wanted.",
];

export default function ProposalPage() {
  const gap = unallocatedAmount();
  return (
    <div className="vx min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="VoxVision School OS home">
            <ProductMark dark />
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm text-[#9ca3af]" aria-label="Proposal sections">
            <a href="#modules" className="hover:text-white">Modules</a>
            <a href="#connected" className="hover:text-white">How it connects</a>
            <a href="#timeline" className="hover:text-white">Timeline</a>
            <a href="#investment" className="hover:text-white">Investment</a>
            <Link href="/guide" className="hover:text-white">Documentation</Link>
          </nav>
          <Link href="/login" className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white whitespace-nowrap">
            Open the application
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-grid">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(108,92,231,0.18),transparent_60%)]" aria-hidden />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#a29bfe] border border-[#6c5ce7]/30 rounded-full px-3 py-1">
              Proposal by {PRODUCT.vendor} for {SCHOOL.name}, Ranchi
            </p>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold font-display leading-[1.05] max-w-4xl">
              One connected system for <span className="gradient-text">learning, teaching and running</span> the school.
            </h1>
            <p className="mt-6 text-lg vx-muted max-w-2xl leading-relaxed">
              VoxVision School OS brings students, teachers, parents, office staff, hostel wardens and management onto one platform.
              Students learn with AI support, teachers prepare and review, parents get answers, and staff run admissions, records and the hostel,
              while management sees it all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] font-semibold text-white">
                Explore the working application <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link href="/admissions" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 font-semibold hover:border-[#a29bfe]">
                Try the parent assistant
              </Link>
            </div>
            <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
              {[
                ["7", "connected modules"],
                ["7", "user roles with separate access"],
                [`${DURATION_WEEKS} weeks`, "proposed implementation"],
                [formatINR(PROJECT_FEE), "proposed project fee"],
              ].map(([v, l]) => (
                <div key={l} className="vx-card px-4 py-3">
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-2xl font-bold font-display">{v}</dd>
                  <dd className="text-xs vx-muted mt-0.5">{l}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-xs vx-muted max-w-3xl flex gap-2">
              <CircleAlert className="w-4 h-4 shrink-0 text-[#a29bfe]" aria-hidden />
              This is VoxVision&apos;s proposal. It has not been commissioned, approved or endorsed by the school. Every record in the
              application is synthetic sample data; it is not connected to any school system.
            </p>
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-display">What each part does</h2>
          <p className="mt-3 vx-muted max-w-2xl">Seven modules, each built for the people who use it every day. Everything described here works in the application you can open now, except where the status note says otherwise.</p>
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {MODULES.map((m) => (
              <article key={m.name} className="vx-card p-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#6c5ce7]/15 flex items-center justify-center">
                    <m.icon className="w-5 h-5 text-[#a29bfe]" aria-hidden />
                  </span>
                  <h3 className="text-lg font-bold font-display">{m.name}</h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#d1d5db]">{m.what}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div><dt className="inline font-semibold text-white">Who uses it: </dt><dd className="inline vx-muted">{m.who}</dd></div>
                  <div><dt className="inline font-semibold text-white">How it helps: </dt><dd className="inline vx-muted">{m.helps}</dd></div>
                </dl>
                <p className="mt-4 pt-4 border-t border-white/5 text-xs text-[#9ca3af] mt-auto">
                  <span className="font-semibold text-[#00cec9]">Status: </span>
                  {m.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Connected */}
        <section id="connected" className="border-y border-white/5 bg-[#0d0d14] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-3xl sm:text-4xl font-bold font-display">How the modules work together</h2>
            <p className="mt-3 vx-muted max-w-2xl">
              Information is entered once and used everywhere it is needed. A quiz a teacher publishes feeds the student&apos;s progress,
              the teacher&apos;s class report and the principal&apos;s dashboard, with no re-typing.
            </p>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FLOWS.map((f) => (
                <div key={f.title} className="vx-card p-5">
                  <h3 className="font-bold font-display text-[#a29bfe]">{f.title}</h3>
                  <ol className="mt-4 space-y-0">
                    {f.steps.map((s, i) => (
                      <li key={s} className="relative pl-7 pb-4 last:pb-0 text-sm text-[#d1d5db]">
                        <span className="absolute left-0 top-0 w-5 h-5 rounded-full bg-[#6c5ce7]/25 text-[0.65rem] font-bold flex items-center justify-center text-white">{i + 1}</span>
                        {i < f.steps.length - 1 && <span className="absolute left-[9.5px] top-5 bottom-0 w-px bg-[#6c5ce7]/30" aria-hidden />}
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold font-display">What it means for each group</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: GraduationCap, who: "Students", points: ["Explanations in simple language, any time", "Practice quizzes with instant feedback", "Coding, AI and robotics activities", "A clear view of their own progress"] },
              { icon: Users, who: "Teachers", points: ["Ready-to-edit lesson and question drafts", "Automatic marking of quizzes", "Topic-wise class results", "Attendance and marks in one place"] },
              { icon: MessagesSquare, who: "Parents", points: ["Admission answers in English or Hindi", "Enquiry tracking with a reference number", "Leave and outpass requests online", "Their own child's progress and report card"] },
              { icon: Building2, who: "Management", points: ["One dashboard across departments", "Every enquiry and task followed up", "Hostel status at a glance", "Clear records of who did what"] },
            ].map((g) => (
              <div key={g.who} className="vx-card p-5">
                <g.icon className="w-6 h-6 text-[#00cec9]" aria-hidden />
                <h3 className="mt-3 font-bold font-display text-lg">{g.who}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[#d1d5db]">
                  {g.points.map((p) => (
                    <li key={p} className="flex gap-2"><span className="text-[#a29bfe]" aria-hidden>•</span>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs vx-muted max-w-3xl">
            These are the purposes each feature is designed for. VoxVision does not promise specific results such as higher marks or more admissions;
            how much value the school gets depends on adoption, content and training, which the implementation plan addresses.
          </p>
        </section>

        {/* Scope & school participation */}
        <section className="border-y border-white/5 bg-[#0d0d14]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display">Included in the proposed implementation</h2>
              <ul className="mt-6 space-y-3 text-sm text-[#d1d5db]">
                {[
                  "Discovery workshops and a written scope, data-protection plan and acceptance criteria.",
                  "Set-up of all seven modules described above for the school's classes, roles and workflows.",
                  "Loading school-approved learning material and admissions information with staff.",
                  "Role-based accounts, security configuration and audit logging.",
                  "Testing with staff, training for each role, user manuals and handover documentation.",
                  "Project coordination and an initial support period (duration to be agreed in the contract).",
                ].map((s) => (
                  <li key={s} className="flex gap-3"><ShieldCheck className="w-4 h-4 mt-0.5 text-[#00cec9] shrink-0" aria-hidden />{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display">What we need from the school</h2>
              <ul className="mt-6 space-y-3 text-sm text-[#d1d5db]">
                {SCHOOL_INPUTS.map((s) => (
                  <li key={s} className="flex gap-3"><Users className="w-4 h-4 mt-0.5 text-[#a29bfe] shrink-0" aria-hidden />{s}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs vx-muted">
                VoxVision will not connect to, or send data to, any school system without written authorisation. Integration with the existing ERP
                is not promised until compatibility is confirmed.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section id="timeline" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-16">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-7 h-7 text-[#00cec9]" aria-hidden />
            <h2 className="text-3xl sm:text-4xl font-bold font-display">{DURATION_WEEKS}-week implementation plan</h2>
          </div>
          <p className="mt-3 vx-muted max-w-2xl">The schedule starts after the agreement is signed and the school&apos;s prerequisites (people, approvals and access) are in place.</p>
          <ol className="mt-10 space-y-3">
            {TIMELINE.map((t) => (
              <li key={t.phase} className="vx-card p-5 grid sm:grid-cols-[7rem_14rem_1fr_auto] gap-2 sm:gap-6 items-start">
                <span className="text-sm font-bold text-[#a29bfe]">Weeks {t.weeks}</span>
                <span className="font-semibold">{t.phase}</span>
                <span className="text-sm text-[#d1d5db]">{t.work}</span>
                {t.payment ? <span className="text-xs font-semibold text-[#00cec9] sm:text-right whitespace-nowrap">{t.payment}</span> : <span className="hidden sm:block" />}
              </li>
            ))}
          </ol>
        </section>

        {/* Investment */}
        <section id="investment" className="border-t border-white/5 bg-[#0d0d14] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <h2 className="text-3xl sm:text-4xl font-bold font-display">Proposed investment</h2>
            <p className="mt-3 vx-muted max-w-2xl">A fixed project fee of {formatINR(PROJECT_FEE)} for the scope described above, paid in four milestones.</p>
            <div className="mt-10 grid lg:grid-cols-2 gap-6">
              <div className="vx-card p-6">
                <h3 className="font-bold font-display">Fee breakdown</h3>
                <table className="w-full mt-4 text-sm">
                  <tbody>
                    {BUDGET_LINES.map((l) => (
                      <tr key={l.item} className="border-b border-white/5">
                        <td className="py-2.5 pr-3 text-[#d1d5db]">{l.item}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{formatINR(l.amount)}</td>
                      </tr>
                    ))}
                    {gap !== 0 && (
                      <tr className="border-b border-white/5 bg-[#fab219]/10">
                        <td className="py-2.5 px-2 text-[#ffd479]">
                          <span className="font-semibold">To be reconciled.</span> {UNALLOCATED_NOTE}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold tabular-nums text-[#ffd479]">{formatINR(gap)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="pt-3 font-bold">Total proposed project fee</td>
                      <td className="pt-3 text-right font-bold text-lg tabular-nums">{formatINR(PROJECT_FEE)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="vx-card p-6">
                <h3 className="font-bold font-display">Payment milestones</h3>
                <table className="w-full mt-4 text-sm">
                  <tbody>
                    {MILESTONES.map((m) => (
                      <tr key={m.label} className="border-b border-white/5 align-top">
                        <td className="py-2.5 pr-3 w-12 font-bold text-[#a29bfe]">{m.percent}%</td>
                        <td className="py-2.5 pr-3">
                          <span className="font-semibold">{m.label}</span>
                          <span className="block text-xs vx-muted">{m.trigger}</span>
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{formatINR(m.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-3 font-bold">100%</td>
                      <td className="pt-3 font-bold">Total</td>
                      <td className="pt-3 text-right font-bold text-lg tabular-nums">{formatINR(milestoneTotal())}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 grid lg:grid-cols-2 gap-6">
              <div className="vx-card p-6">
                <h3 className="font-bold font-display">Not included in the fee</h3>
                <ul className="mt-4 space-y-2 text-sm text-[#d1d5db]">
                  {EXCLUSIONS.map((e) => (
                    <li key={e} className="flex gap-2"><span className="text-[#fab219]" aria-hidden>–</span>{e}</li>
                  ))}
                </ul>
              </div>
              <div className="vx-card p-6">
                <h3 className="font-bold font-display">To be agreed in the contract</h3>
                <ul className="mt-4 space-y-2 text-sm text-[#d1d5db]">
                  {[
                    "The final scope of each module and its acceptance criteria.",
                    "Production hosting and deployment responsibilities.",
                    "Source-code licensing or ownership and intellectual-property terms.",
                    "Duration and level of support after handover.",
                    "Data-protection responsibilities of the school and VoxVision.",
                  ].map((e) => (
                    <li key={e} className="flex gap-2"><FileText className="w-4 h-4 mt-0.5 text-[#a29bfe] shrink-0" aria-hidden />{e}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs vx-muted">
                  The fee covers the scope described in this proposal. It does not cover unlimited features, hardware or third-party services.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Responsible AI */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold font-display">Responsible by design</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm text-[#d1d5db]">
            {[
              ["Teachers stay in charge", "AI can only draft. Lesson plans and questions are saved as drafts and reach students only after a teacher approves them."],
              ["Answers from approved sources", "The learning assistant explains from material teachers approved. The admissions assistant answers only from school-confirmed information."],
              ["People decide", "No admission, discipline, welfare or hostel decision is made automatically. Every approval has a named staff member."],
              ["Child safety first", "If a student writes about harm, bullying or distress, the assistant stops, points them to a trusted adult and CHILDLINE 1098, and does not store the message."],
              ["Private by default", "Each role sees only what it needs; parents see only their own child. Every change is logged."],
              ["Honest about AI", "When AI is not switched on, the screen says so and shows approved material instead. It never pretends to be AI."],
            ].map(([t, d]) => (
              <div key={t} className="vx-card p-5">
                <h3 className="font-semibold text-white">{t}</h3>
                <p className="mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 vx-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold font-display">See it working</h3>
              <p className="mt-1 text-sm vx-muted">Sign in as a student, teacher, parent, office staff, warden or principal. Every account uses synthetic sample data.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] font-semibold text-white">
                Open the application <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link href="/guide" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 font-semibold hover:border-[#a29bfe]">
                Documentation and user guides
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-6 justify-between text-sm vx-muted">
          <div className="max-w-xl">
            <ProductMark dark />
            <p className="mt-4 text-xs leading-relaxed">
              Proposal prepared by {PRODUCT.vendor} for {SCHOOL.name}, {SCHOOL.city}. {PRODUCT.vendor} is not affiliated with the school, and the school has
              not endorsed this proposal. School details are taken from its public website and await the school&apos;s confirmation.
            </p>
          </div>
          <div className="space-y-1.5 text-xs">
            <a href={PRODUCT.vendorSite} className="block hover:text-white">voxvision.site</a>
            <a href={`mailto:${PRODUCT.vendorEmail}`} className="block hover:text-white">{PRODUCT.vendorEmail}</a>
            <a href="tel:+917975882681" className="block hover:text-white">{PRODUCT.vendorPhone}</a>
            <Link href="/privacy" className="block hover:text-white">Privacy notice</Link>
            <p>© {new Date().getFullYear()} VoxVision. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
