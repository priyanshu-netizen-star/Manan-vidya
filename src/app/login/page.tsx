import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { ROLE_LABELS } from "@/lib/rbac";
import { SEED_ACCOUNTS, seedPassword } from "@/lib/seed";
import { LoginForm, RolePicker } from "./LoginForm";

export const metadata = { title: "Sign in" };

const ROLE_BLURB: Record<string, string> = {
  student: "Learn topics, ask questions, take quizzes, coding and robotics",
  parent: "Child's progress, report card, hostel leave requests",
  teacher: "Content, quizzes, AI lesson tools, attendance and marks",
  teacher2: "Second teacher (English, Social Science, Computer Science)",
  office: "Admissions enquiries, knowledge base, records and exams",
  warden: "Rooms and beds, leave approvals, roll-call, maintenance",
  management: "Command centre, reports, approvals and audit",
  admin: "Users, AI configuration, audit and data reset",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/app");
  const presentation = isPresentation();
  const usingDefaultPassword = !process.env.SEED_PASSWORD;
  return (
    <div className="min-h-screen vx bg-grid flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Back to the proposal">
          <ProductMark dark />
        </Link>
        <Link href="/" className="text-sm vx-muted hover:text-white">
          ← Proposal overview
        </Link>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        <section className="vx-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold font-display">Sign in</h1>
          <p className="mt-1 text-sm vx-muted">Use the account your school administrator gave you.</p>
          <LoginForm />
          {presentation && usingDefaultPassword && (
            <p className="mt-6 text-xs vx-muted">
              Presentation accounts use the password <code className="text-white">{seedPassword()}</code> (e.g. <code className="text-white">teacher@school-os.example</code>).
            </p>
          )}
        </section>
        {presentation && (
          <section aria-labelledby="roles-h">
            <h2 id="roles-h" className="text-lg font-bold font-display">Explore by role</h2>
            <p className="text-sm vx-muted mt-1">
              One click signs you in as that person. All accounts and records are synthetic sample data created for this presentation.
            </p>
            <RolePicker
              accounts={SEED_ACCOUNTS.map((a) => ({
                key: a.key,
                name: a.name,
                role: ROLE_LABELS[a.role],
                blurb: ROLE_BLURB[a.key],
              }))}
            />
          </section>
        )}
      </main>
    </div>
  );
}
