import Link from "next/link";
import { Copilot, CopilotButton } from "@/components/ai/Copilot";
import { CommandPalette } from "@/components/CommandPalette";
import { ProductMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured, isPresentation, SCHOOL } from "@/lib/config";
import { navFor } from "@/lib/nav";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { MobileMenu, Sidebar, SignOutButton } from "./Sidebar";

const SUGGESTIONS: Record<Role, string[]> = {
  student: ["What should I revise this week?", "Which quizzes have I not done yet?", "How do I request an outpass?"],
  parent: ["How is my child doing?", "How do I request leave for my child?", "Where can I see the report card?"],
  teacher: ["What needs my attention today?", "Which topics should I re-teach?", "How do I publish a quiz?"],
  office_admin: ["What needs my attention today?", "Which enquiries are overdue?", "How do I update the assistant's answers?"],
  warden: ["What needs my attention today?", "Who is out on leave right now?", "How do I record roll-call?"],
  management: ["Give me today's school overview", "Where is attendance weakest?", "Which enquiries need a reply?"],
  platform_admin: ["Give me today's school overview", "What is still needed before go-live?", "How do I create a user?"],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const groups = navFor(user.role);
  const pages = groups.flatMap((g) => g.items.map((i) => ({ label: i.label, href: i.href, group: g.label })));
  const initials = user.name.replace(/\(.*?\)|[^\p{L} ]/gu, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";
  return (
    <div className="min-h-screen">
      {isPresentation() && (
        <div className="bg-gradient-to-r from-[#1b1530] via-[#231a45] to-[#122a33] text-[#e9e6ff] text-xs px-4 py-2 text-center no-print" role="note">
          <strong>Presentation environment.</strong> All records are synthetic sample data. Not connected to {SCHOOL.name} systems.
          {!aiConfigured() && " AI service not configured: AI features show approved material instead."}
        </div>
      )}
      <div className="flex">
        <Sidebar groups={groups} />
        <div className="flex-1 min-w-0">
          <header className="shell-header sticky top-0 z-30 h-16 border-b border-line flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 no-print">
            <div className="flex items-center gap-2 min-w-0">
              <MobileMenu groups={groups} />
              <Link href="/app" className="lg:hidden hidden sm:block" aria-label="Dashboard"><ProductMark id="vx-head" /></Link>
              <CommandPalette pages={pages} />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <CopilotButton />
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2.5 pl-2 ml-1 border-l border-line min-w-0">
                <span className="icon-tile !w-9 !h-9 !rounded-full text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#6c5ce7,#00a8a4)" }} aria-hidden>{initials}</span>
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-ink truncate max-w-[11rem]">{user.name}</p>
                  <p className="text-[0.7rem] text-muted truncate max-w-[11rem]">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>
              <SignOutButton compact />
            </div>
          </header>
          <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl print-area animate-in">{children}</main>
        </div>
      </div>
      <Copilot firstName={user.name.split(" ")[0]} suggestions={SUGGESTIONS[user.role]} aiEnabled={aiConfigured()} />
    </div>
  );
}
