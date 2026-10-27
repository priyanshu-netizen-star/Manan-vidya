import Link from "next/link";
import {
  ArrowRight, BarChart3, BedDouble, BookOpenCheck, Bot, Building2, CalendarClock, Check, CircleAlert, ClipboardCheck, Code2,
  FileText, GraduationCap, Languages, LayoutDashboard, Lock, MessagesSquare, PenLine, ScrollText, Search, ShieldCheck,
  Sparkles, Star, UserCheck, Users, Wand2,
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
    status: "Working: topics, approved material, quizzes, instant marking, explanations, progress, AI study assistant. AI answers need the school's AI account.",
  },
  {
    icon: BookOpenCheck, name: "Teacher workspace", fee: "AI-powered learning pilot",
    what: "Teachers manage classes and subjects, write or approve learning material, build question banks, worksheets and quizzes, publish them to a class, and review results topic by topic. AI can draft lesson plans, questions and material, which the teacher always reviews first.",
    who: "Teachers; the principal can approve and review.",
    helps: "Less time on preparation and marking; clear evidence of which topics need re-teaching.",
    status: "Working: content, question bank, worksheets, quizzes, publishing, performance views, AI drafts and class insights.",
  },
  {
    icon: MessagesSquare, name: "Admissions and parent assistant", fee: "AI admissions assistant and lead tracking",
    what: "Parents ask questions in English or Hindi and get answers taken only from information the school has approved. Anything about fees, guarantees, health or safety, or anything it is not sure about, is handed to a staff member. Parents can leave an enquiry and track it with a reference number.",
    who: "Parents (public page); office and admissions staff.",
    helps: "Parents get answers at any hour; no enquiry is lost; staff see every follow-up due.",
    status: "Working: bilingual knowledge base, escalation, enquiry tracking, staff workflow, AI reply drafts. The school must confirm every answer and the Hindi wording.",
  },
  {
    icon: ClipboardCheck, name: "School administration workflows", fee: "ERP workflow and administration automation",
    what: "Student records, daily attendance, examination marks and printable report cards with teacher remarks, task tracking for staff, administrative reports you can question in plain English, and role-based access so each person sees only what their job needs.",
    who: "Office staff, class teachers, principal and management.",
    helps: "One accurate record instead of registers and spreadsheets; report cards in minutes.",
    status: "Working in the application. Connecting to the school's existing ERP is only possible after we review it and the vendor confirms access.",
  },
  {
    icon: BedDouble, name: "Hostel management", fee: "Digital hostel management",
    what: "Room and bed allocation, leave and outpass requests from parents with warden approval, morning and night roll-call, maintenance requests with suggested priority, and a full history of every request.",
    who: "Wardens, parents of boarders, management.",
    helps: "Wardens always know who is on campus; parents get a clear answer; nothing depends on a paper slip.",
    status: "Working with sample records. Real hostel data only after the school authorises it.",
  },
  {
    icon: Code2, name: "AI, coding and robotics learning", fee: "Part of the learning platform",
    what: "Structured lessons and interactive challenges in Python and web development, AI-literacy lessons on using AI safely, a virtual robot that students program, and an AI tutor that gives hints without giving away answers.",
    who: "Students and computer teachers.",
    helps: "Hands-on future skills from Class VI onwards, without needing hardware to start.",
    status: "Working in software. Robotics kits, sensors and workshops need separate approval and are not in the fee.",
  },
  {
    icon: LayoutDashboard, name: "Management command centre", fee: "Included across modules",
    what: "One screen for the principal and management: an executive briefing, enquiry pipeline, attendance trends, quiz performance by topic, hostel status, open tasks, search across records, and plain-English questions about school data.",
    who: "Principal, chairman and management.",
    helps: "Decisions based on up-to-date numbers rather than asking each department.",
    status: "Working. It shows sample data now and real data only after authorised integration.",
  },
];

const AI_FEATURES = [
  { icon: Sparkles, title: "AI study assistant", who: "Students", text: "Explanations, step-by-step examples, revision notes, flashcards and practice questions, in English or Hindi, from teacher-approved material only." },
  { icon: Bot, title: "AI Copilot on every page", who: "Everyone", text: "Ask “what needs my attention?” or “how do I…?”. It answers from that person's own records and the user guide, and never decides anything." },
  { icon: PenLine, title: "Teacher drafts", who: "Teachers", text: "Lesson plans, question banks, learning material and report-card remarks drafted in seconds. Nothing reaches students or parents until a teacher approves it." },
  { icon: BarChart3, title: "Class insights", who: "Teachers", text: "Finds the most common wrong answers and suggests likely misconceptions and what to re-teach." },
  { icon: Search, title: "Ask your data", who: "Office & management", text: "“Which students have low attendance?” is answered from the standard reports in plain English, with the data underneath." },
  { icon: Languages, title: "Bilingual admissions assistant", who: "Parents & office", text: "Answers parents from school-confirmed facts, hands sensitive questions to staff, and drafts replies for the office to send." },
];

const FLOWS = [
  { title: "Learning loop", icon: GraduationCap, steps: ["Teacher approves material and publishes a quiz", "Student studies, asks questions, takes the quiz", "Marks and explanations appear instantly", "Teacher sees topic-wise results", "Management sees performance trends"] },
  { title: "Admissions loop", icon: MessagesSquare, steps: ["Parent asks the assistant (English or Hindi)", "Verified answer, or hand-off to staff", "Enquiry gets a reference number", "Staff follow up and update status", "Management sees the enquiry pipeline"] },
  { title: "Hostel loop", icon: BedDouble, steps: ["Parent requests leave or outpass", "Warden approves or rejects with a note", "Check-out and return are recorded", "Roll-call shows who is on leave", "Management sees hostel status"] },
  { title: "Records loop", icon: ClipboardCheck, steps: ["Teachers mark attendance and enter marks", "Office keeps student records", "Report cards are generated and printed", "Parents see their own child only", "Management sees attendance and results"] },
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

const GROUPS = [
  { icon: GraduationCap, who: "Students", color: "#a29bfe", points: ["A personal AI study assistant for every topic", "Practice quizzes with instant feedback", "Coding, AI and robotics activities", "A clear view of their own progress"] },
  { icon: Users, who: "Teachers", color: "#00cec9", points: ["Ready-to-edit lesson, question and remark drafts", "Automatic marking of quizzes", "Misconceptions found from class answers", "Attendance and marks in one place"] },
  { icon: MessagesSquare, who: "Parents", color: "#fdcb6e", points: ["Admission answers in English or Hindi", "Enquiry tracking with a reference number", "Leave and outpass requests online", "Their own child's progress and report card"] },
  { icon: Building2, who: "Management", color: "#55efc4", points: ["A daily executive briefing", "Plain-English questions about school data", "Every enquiry and task followed up", "Clear records of who did what"] },
];

const PRINCIPLES = [
  { icon: UserCheck, title: "Teachers stay in charge", text: "AI can only draft. Lesson plans, questions, material and remarks are saved as drafts and reach students or families only after a teacher approves them." },
  { icon: BookOpenCheck, title: "Answers from approved sources", text: "The study assistant teaches from material teachers approved. The admissions assistant answers only from school-confirmed information." },
  { icon: Users, title: "People decide", text: "No admission, discipline, welfare or hostel decision is made automatically. Every approval has a named staff member." },
  { icon: ShieldCheck, title: "Child safety first", text: "If a student writes about harm, bullying or distress, the assistant stops, points them to a trusted adult and CHILDLINE 1098, and does not store the message." },
  { icon: Lock, title: "Private by default", text: "Each role sees only what it needs, parents see only their own child, and the AI sees only what the signed-in person may see. Every change is logged." },
  { icon: Wand2, title: "Honest about AI", text: "Every result is labelled “AI generated” or “Automatic (not AI)”. When AI is off, each feature still works from approved content and says so." },
];

/** Illustration of the application (markup only, synthetic content), shown beside the hero text. */
function ProductPreview() {
  return (
    <div className="relative" aria-hidden>
      <div className="vx-ring rounded-2xl shadow-[0_40px_120px_-30px_rgba(108,92,231,0.6)] overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/5 bg-[#0f0e1a]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" /><span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" /><span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 flex-1 max-w-[16rem] h-5 rounded-md bg-white/5 text-[0.6rem] text-[#8e88b8] flex items-center px-2 truncate">voxvision.site/mananvidyademo/app</span>
        </div>
        <div className="flex">
          <div className="hidden sm:flex w-28 flex-col gap-1.5 p-3 bg-[#0c0a18] border-r border-white/5">
            {["Dashboard", "AI study", "Learn", "Quizzes", "Progress", "Coding"].map((n, i) => (
              <span key={n} className={`text-[0.6rem] rounded-md px-2 py-1 ${i === 1 ? "bg-gradient-to-r from-[#6c5ce7]/50 to-[#00cec9]/20 text-white" : "text-[#8e88b8]"}`}>{n}</span>
            ))}
          </div>
          <div className="flex-1 p-3 sm:p-4 space-y-3 bg-[#0b0a14] min-w-0">
            <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(120deg,#1c1640 0%,#3a2b8f 45%,#0f5c63 100%)" }}>
              <p className="text-[0.55rem] uppercase tracking-widest text-white/60">Student · Class VIII</p>
              <p className="text-sm font-bold font-display">Good morning, Aarav</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["Topics secure", "4 / 8", "#55efc4"], ["Quizzes to do", "3", "#fdcb6e"], ["Attempts", "7", "#a29bfe"]].map(([l, v, c]) => (
                <div key={l} className="rounded-lg bg-white/[0.04] border border-white/5 p-2">
                  <p className="text-[0.5rem] uppercase tracking-wider text-[#8e88b8]">{l}</p>
                  <p className="text-sm font-bold font-display" style={{ color: c }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/5 p-2.5 space-y-1.5">
              {[["Force and Pressure", 100], ["Rational Numbers", 80], ["Exponents and Powers", 40]].map(([t, v]) => (
                <div key={t as string} className="flex items-center gap-2">
                  <span className="text-[0.55rem] text-[#cfcbe6] w-24 truncate">{t}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-white/5"><span className="block h-1.5 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9]" style={{ width: `${v}%` }} /></span>
                  <span className="text-[0.55rem] text-[#8e88b8] w-6 text-right">{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bob absolute -bottom-10 -left-4 sm:-left-10 w-64 vx-glass rounded-2xl p-3.5 shadow-2xl">
        <p className="flex items-center gap-1.5 text-[0.65rem] font-bold text-white"><span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] bg-gradient-to-r from-[#6c5ce7] to-[#00a8a4]"><Sparkles className="w-2.5 h-2.5" /> AI</span> Study assistant</p>
        <p className="mt-2 ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-[#6c5ce7] px-2.5 py-1.5 text-[0.62rem] text-white">Why do school bags have wide straps?</p>
        <p className="mt-2 rounded-xl rounded-bl-sm bg-white/[0.06] px-2.5 py-1.5 text-[0.62rem] leading-relaxed text-[#e4e1ff]">Wide straps spread the bag&apos;s weight over a <b>larger area</b>, so the <b>pressure</b> on your shoulders is lower…</p>
      </div>
      <div className="bob-slow absolute -top-6 -right-2 sm:-right-8 vx-glass rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-[#55efc4]/15 text-[#55efc4] flex items-center justify-center"><Check className="w-4 h-4" /></span>
        <span><span className="block text-[0.6rem] text-[#8e88b8]">Quiz marked instantly</span><span className="block text-xs font-bold text-white">4 / 5 · 80%</span></span>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, intro, center = false }: { eyebrow: string; title: React.ReactNode; intro?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center max-w-3xl mx-auto" : "max-w-3xl"}>
      <p className="vx-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl sm:text-[2.6rem] leading-[1.1] font-bold font-display tracking-tight">{title}</h2>
      {intro && <p className="mt-4 vx-muted text-[1.02rem] leading-relaxed">{intro}</p>}
    </div>
  );
}

export default function ProposalPage() {
  const gap = unallocatedAmount();
  const maxLine = Math.max(...BUDGET_LINES.map((l) => l.amount));
  return (
    <div className="vx min-h-screen overflow-x-clip">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="VoxVision School OS home">
            <ProductMark dark />
          </Link>
          <nav className="hidden lg:flex items-center gap-7 text-sm text-[#9ca3af]" aria-label="Proposal sections">
            <a href="#ai" className="hover:text-white transition-colors">AI</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#connected" className="hover:text-white transition-colors">How it connects</a>
            <a href="#timeline" className="hover:text-white transition-colors">Timeline</a>
            <a href="#investment" className="hover:text-white transition-colors">Investment</a>
            <Link href="/guide" className="hover:text-white transition-colors">Documentation</Link>
          </nav>
          <Link href="/login" className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white whitespace-nowrap shadow-[0_8px_24px_-8px_rgba(108,92,231,0.8)] hover:brightness-110 transition">
            Open the application
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative bg-grid">
          <div className="orb w-[34rem] h-[34rem] -top-40 -left-32 bg-[#6c5ce7]/40" aria-hidden />
          <div className="orb w-[28rem] h-[28rem] top-20 -right-24 bg-[#00cec9]/25" style={{ animationDelay: "-6s" }} aria-hidden />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.12fr_1fr] gap-16 lg:gap-12 items-center">
            <div className="animate-in">
              <p className="vx-pill !text-[#a29bfe] !border-[#6c5ce7]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00cec9] shadow-[0_0_10px_#00cec9]" aria-hidden />
                Proposal by {PRODUCT.vendor} for {SCHOOL.name}, Ranchi
              </p>
              <h1 className="mt-6 text-[2.4rem] sm:text-5xl xl:text-[3.4rem] font-bold font-display leading-[1.03] tracking-tight">
                One connected, <span className="gradient-text">AI-powered</span> system for learning, teaching and running the school.
              </h1>
              <p className="mt-6 text-lg vx-muted max-w-xl leading-relaxed">
                Students learn with a personal AI study assistant, teachers prepare and review in minutes, parents get answers in English or Hindi,
                and staff run admissions, records and the hostel, while management sees everything in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] font-semibold text-white shadow-[0_12px_32px_-10px_rgba(108,92,231,0.9)] hover:brightness-110 transition">
                  Explore the working application <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/admissions" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 bg-white/[0.03] font-semibold hover:border-[#a29bfe] transition-colors">
                  <MessagesSquare className="w-4 h-4" aria-hidden /> Try the parent assistant
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["7", "connected modules"],
                  ["12+", "AI features, all human-reviewed"],
                  [`${DURATION_WEEKS} weeks`, "proposed implementation"],
                  [formatINR(PROJECT_FEE), "proposed project fee"],
                ].map(([v, l]) => (
                  <div key={l} className="vx-card px-4 py-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-lg sm:text-[1.3rem] font-bold font-display whitespace-nowrap">{v}</dd>
                    <dd className="text-[0.72rem] vx-muted mt-0.5 leading-snug">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="px-4 sm:px-8 lg:px-0 animate-in" style={{ animationDelay: "0.15s" }}>
              <ProductPreview />
            </div>
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-12">
            <p className="text-xs vx-muted max-w-3xl flex gap-2">
              <CircleAlert className="w-4 h-4 shrink-0 text-[#a29bfe]" aria-hidden />
              This is VoxVision&apos;s proposal. It has not been commissioned, approved or endorsed by the school. Every record in the
              application is synthetic sample data; it is not connected to any school system.
            </p>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-white/5 bg-[#0c0b13]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap justify-center gap-2.5">
            {[[GraduationCap, "Designed for a CBSE school"], [Languages, "English and Hindi"], [BedDouble, "Day and boarding"], [Lock, "Role-based privacy"], [ShieldCheck, "Child safety built in"], [Bot, "Works with or without AI"]].map(([Icon, t]) => {
              const I = Icon as typeof Lock;
              return <span key={t as string} className="vx-pill"><I className="w-3.5 h-3.5 text-[#00cec9]" aria-hidden /> {t as string}</span>;
            })}
          </div>
        </section>

        {/* AI showcase */}
        <section id="ai" className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <SectionHead
            center
            eyebrow="AI in every module"
            title={<>An AI assistant for <span className="gradient-text">every person</span> in the school</>}
            intro="AI explains, drafts, summarises and suggests. People approve and decide. Every AI answer is grounded in the school's own approved content and records, and every one is clearly labelled."
          />
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AI_FEATURES.map((f) => (
              <article key={f.title} className="vx-card vx-card-hover p-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#6c5ce7]/15 blur-2xl" aria-hidden />
                <span className="relative inline-flex w-11 h-11 rounded-xl items-center justify-center text-white bg-gradient-to-br from-[#6c5ce7] to-[#00a8a4] shadow-[0_10px_24px_-10px_rgba(108,92,231,0.9)]">
                  <f.icon className="w-5 h-5" aria-hidden />
                </span>
                <p className="relative mt-4 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#00cec9]">{f.who}</p>
                <h3 className="relative mt-1 text-lg font-bold font-display">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-[#cfd1db]">{f.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-xs vx-muted">Also: explain-my-mistake after quizzes, an AI coding tutor, daily briefings, maintenance triage and Ctrl&nbsp;K search. AI usage is billed separately by the provider.</p>
        </section>

        {/* Modules */}
        <section id="modules" className="border-t border-white/5 bg-[#0c0b13] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <SectionHead
              eyebrow="Seven modules"
              title="What each part does"
              intro="Each module is built for the people who use it every day. Everything described here works in the application you can open now, except where the status note says otherwise."
            />
            <div className="mt-12 grid md:grid-cols-2 gap-5">
              {MODULES.map((m, i) => (
                <article key={m.name} className={`vx-card vx-card-hover p-6 flex flex-col ${i === MODULES.length - 1 ? "md:col-span-2" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6c5ce7]/25 to-[#00cec9]/10 border border-white/10 flex items-center justify-center">
                        <m.icon className="w-5 h-5 text-[#c9c3ff]" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8e88b8]">Module {String.fromCharCode(65 + i)}</p>
                        <h3 className="text-lg font-bold font-display leading-tight">{m.name}</h3>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#d1d5db]">{m.what}</p>
                  <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#a29bfe]">Who uses it</dt><dd className="mt-1 text-[#cfd1db]">{m.who}</dd></div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3"><dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#a29bfe]">How it helps</dt><dd className="mt-1 text-[#cfd1db]">{m.helps}</dd></div>
                  </dl>
                  <p className="mt-4 pt-4 border-t border-white/5 text-xs text-[#9ca3af] mt-auto flex gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#00cec9] shrink-0" aria-hidden />
                    <span><span className="font-semibold text-[#00cec9]">Status: </span>{m.status}</span>
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Connected */}
        <section id="connected" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <SectionHead
            eyebrow="One system"
            title="How the modules work together"
            intro={<>Information is entered once and used everywhere it is needed. A quiz a teacher publishes feeds the student&apos;s progress, the teacher&apos;s class report and the principal&apos;s dashboard, with no re-typing.</>}
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FLOWS.map((f) => (
              <div key={f.title} className="vx-card p-5">
                <h3 className="flex items-center gap-2 font-bold font-display"><f.icon className="w-4 h-4 text-[#00cec9]" aria-hidden /> {f.title}</h3>
                <ol className="mt-5 space-y-0">
                  {f.steps.map((s, i) => (
                    <li key={s} className="relative pl-8 pb-4 last:pb-0 text-sm text-[#d1d5db]">
                      <span className="absolute left-0 top-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#00a8a4] text-[0.65rem] font-bold flex items-center justify-center text-white">{i + 1}</span>
                      {i < f.steps.length - 1 && <span className="absolute left-[11.5px] top-6 bottom-0 w-px bg-gradient-to-b from-[#6c5ce7]/60 to-[#00cec9]/20" aria-hidden />}
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="border-y border-white/5 bg-[#0c0b13]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <SectionHead eyebrow="Who benefits" title="What it means for each group" />
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {GROUPS.map((g) => (
                <div key={g.who} className="vx-card vx-card-hover p-6 relative overflow-hidden">
                  <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${g.color}, transparent)` }} aria-hidden />
                  <g.icon className="w-7 h-7" style={{ color: g.color }} aria-hidden />
                  <h3 className="mt-4 font-bold font-display text-lg">{g.who}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-[#d1d5db]">
                    {g.points.map((p) => (
                      <li key={p} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: g.color }} aria-hidden />{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs vx-muted max-w-3xl">
              These are the purposes each feature is designed for. VoxVision does not promise specific results such as higher marks or more admissions;
              how much value the school gets depends on adoption, content and training, which the implementation plan addresses.
            </p>
          </div>
        </section>

        {/* Scope & school participation */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-6">
          <div className="vx-card p-7">
            <p className="vx-eyebrow">Scope</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold font-display">Included in the proposed implementation</h2>
            <ul className="mt-6 space-y-3.5 text-sm text-[#d1d5db]">
              {[
                "Discovery workshops and a written scope, data-protection plan and acceptance criteria.",
                "Set-up of all seven modules described above for the school's classes, roles and workflows.",
                "Loading school-approved learning material and admissions information with staff.",
                "Role-based accounts, security configuration and audit logging.",
                "Testing with staff, training for each role, user manuals and handover documentation.",
                "Project coordination and an initial support period (duration to be agreed in the contract).",
              ].map((s) => (
                <li key={s} className="flex gap-3"><span className="w-5 h-5 rounded-full bg-[#00cec9]/15 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-[#00cec9]" aria-hidden /></span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="vx-card p-7">
            <p className="vx-eyebrow">Partnership</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold font-display">What we need from the school</h2>
            <ul className="mt-6 space-y-3.5 text-sm text-[#d1d5db]">
              {SCHOOL_INPUTS.map((s, i) => (
                <li key={s} className="flex gap-3"><span className="w-5 h-5 rounded-full bg-[#6c5ce7]/20 text-[0.62rem] font-bold text-[#c9c3ff] flex items-center justify-center shrink-0">{i + 1}</span>{s}</li>
              ))}
            </ul>
            <p className="mt-6 text-xs vx-muted">
              VoxVision will not connect to, or send data to, any school system without written authorisation. Integration with the existing ERP
              is not promised until compatibility is confirmed.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section id="timeline" className="border-y border-white/5 bg-[#0c0b13] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <SectionHead
              eyebrow="Plan"
              title={<span className="flex items-center gap-3"><CalendarClock className="w-8 h-8 text-[#00cec9] shrink-0" aria-hidden />{DURATION_WEEKS}-week implementation plan</span>}
              intro="The schedule starts after the agreement is signed and the school's prerequisites (people, approvals and access) are in place."
            />
            <ol className="mt-12 relative">
              <span className="absolute left-[15px] sm:left-[7.5rem] top-2 bottom-2 w-px bg-gradient-to-b from-[#6c5ce7] via-[#6c5ce7]/50 to-[#00cec9]" aria-hidden />
              {TIMELINE.map((t, i) => (
                <li key={t.phase} className="relative grid sm:grid-cols-[7rem_1fr] gap-x-8 pb-6 last:pb-0">
                  <span className="hidden sm:block pt-4 text-sm font-bold text-[#a29bfe] text-right pr-2">{t.weeks.includes("–") ? "Weeks" : "Week"} {t.weeks}</span>
                  <span className="absolute left-[8px] sm:left-[calc(7.5rem-7px)] top-5 w-[15px] h-[15px] rounded-full border-2 border-[#0c0b13] bg-gradient-to-br from-[#6c5ce7] to-[#00cec9]" aria-hidden />
                  <div className="ml-10 sm:ml-0 vx-card vx-card-hover p-5 flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                    <div className="md:w-56 shrink-0">
                      <p className="sm:hidden text-xs font-bold text-[#a29bfe]">{t.weeks.includes("–") ? "Weeks" : "Week"} {t.weeks}</p>
                      <p className="font-semibold font-display">{i + 1}. {t.phase}</p>
                    </div>
                    <p className="text-sm text-[#d1d5db] flex-1">{t.work}</p>
                    {t.payment && <span className="vx-pill !text-[#00cec9] !border-[#00cec9]/30 self-start whitespace-nowrap">{t.payment}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Investment */}
        <section id="investment" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <SectionHead eyebrow="Investment" title="Proposed investment" intro={`A fixed project fee of ${formatINR(PROJECT_FEE)} for the scope described above, paid in four milestones.`} />
          <div className="mt-12 grid lg:grid-cols-[1.15fr_1fr] gap-6">
            <div className="vx-ring rounded-2xl p-6 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <h3 className="font-bold font-display text-lg">Fee breakdown</h3>
                <p className="text-right"><span className="block text-xs vx-muted">Total proposed project fee</span><span className="text-3xl font-bold font-display gradient-text tabular-nums">{formatINR(PROJECT_FEE)}</span></p>
              </div>
              <table className="w-full mt-6 text-sm">
                <tbody>
                  {BUDGET_LINES.map((l) => (
                    <tr key={l.item} className="border-b border-white/5">
                      <td className="py-3 pr-3 text-[#d1d5db]">
                        {l.item}
                        <span className="mt-1.5 block h-1 rounded-full bg-white/5"><span className="block h-1 rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9]" style={{ width: `${(100 * l.amount) / maxLine}%` }} /></span>
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums align-top">{formatINR(l.amount)}</td>
                    </tr>
                  ))}
                  {gap !== 0 && (
                    <tr className="border-b border-white/5 bg-[#fab219]/10">
                      <td className="py-3 px-2 text-[#ffd479]">
                        <span className="font-semibold">To be reconciled.</span> {UNALLOCATED_NOTE}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold tabular-nums text-[#ffd479] align-top">{formatINR(gap)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pt-4 font-bold">Total proposed project fee</td>
                    <td className="pt-4 text-right font-bold text-lg tabular-nums">{formatINR(PROJECT_FEE)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="vx-card p-6 sm:p-7">
              <h3 className="font-bold font-display text-lg">Payment milestones</h3>
              <ol className="mt-6 space-y-3">
                {MILESTONES.map((m) => (
                  <li key={m.label} className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/5 p-3.5">
                    <span
                      className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: `conic-gradient(#6c5ce7 0 ${m.percent}%, rgba(255,255,255,0.06) ${m.percent}% 100%)` }}
                    >
                      <span className="w-11 h-11 rounded-full bg-[#11101c] flex items-center justify-center">{m.percent}%</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">{m.label}</span>
                      <span className="block text-xs vx-muted">{m.trigger}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatINR(m.amount)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex justify-between text-sm font-bold"><span>100% · Total</span><span className="tabular-nums">{formatINR(milestoneTotal())}</span></p>
            </div>
          </div>
          <div className="mt-6 grid lg:grid-cols-2 gap-6">
            <div className="vx-card p-6 sm:p-7">
              <h3 className="font-bold font-display">Not included in the fee</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#d1d5db]">
                {EXCLUSIONS.map((e) => (
                  <li key={e} className="flex gap-2.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#fab219] shrink-0" aria-hidden />{e}</li>
                ))}
              </ul>
            </div>
            <div className="vx-card p-6 sm:p-7">
              <h3 className="font-bold font-display">To be agreed in the contract</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#d1d5db]">
                {[
                  "The final scope of each module and its acceptance criteria.",
                  "Production hosting and deployment responsibilities.",
                  "Source-code licensing or ownership and intellectual-property terms.",
                  "Duration and level of support after handover.",
                  "Data-protection responsibilities of the school and VoxVision.",
                ].map((e) => (
                  <li key={e} className="flex gap-2.5"><FileText className="w-4 h-4 mt-0.5 text-[#a29bfe] shrink-0" aria-hidden />{e}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs vx-muted">
                The fee covers the scope described in this proposal. It does not cover unlimited features, hardware or third-party services.
              </p>
            </div>
          </div>
        </section>

        {/* Responsible AI */}
        <section className="border-t border-white/5 bg-[#0c0b13]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <SectionHead center eyebrow="Trust" title="Responsible by design" intro="Powerful AI, with people firmly in charge of every decision about a child." />
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm text-[#d1d5db]">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="vx-card vx-card-hover p-6">
                  <span className="w-10 h-10 rounded-xl bg-[#00cec9]/10 border border-[#00cec9]/20 flex items-center justify-center"><p.icon className="w-5 h-5 text-[#00cec9]" aria-hidden /></span>
                  <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12" style={{ background: "linear-gradient(120deg,#1c1640 0%,#3a2b8f 50%,#0f5c63 100%)" }}>
            <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
            <div className="orb w-80 h-80 -right-20 -top-24 bg-[#00cec9]/30" aria-hidden />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="flex items-center gap-1 text-[#ffd479]" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}</p>
                <h3 className="mt-3 text-3xl sm:text-4xl font-bold font-display tracking-tight">See it working, right now</h3>
                <p className="mt-3 text-white/80">Sign in with one click as a student, teacher, parent, office staff, warden or principal, and try every AI feature. Every account uses synthetic sample data.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#1c1640] font-semibold hover:bg-white/90 transition">
                  Open the application <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/guide" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 font-semibold hover:bg-white/10 transition">
                  <ScrollText className="w-4 h-4" aria-hidden /> Documentation
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-6 justify-between text-sm vx-muted">
          <div className="max-w-xl">
            <ProductMark dark id="vx-foot" />
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
