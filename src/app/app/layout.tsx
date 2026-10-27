import Link from "next/link";
import { ProductMark } from "@/components/Logo";
import { requirePageUser } from "@/lib/auth";
import { aiConfigured, isPresentation, SCHOOL } from "@/lib/config";
import { navFor } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/rbac";
import { Sidebar, SignOutButton } from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const groups = navFor(user.role);
  return (
    <div className="min-h-screen bg-page">
      {isPresentation() && (
        <div className="bg-[#1b1530] text-[#e9e6ff] text-xs px-4 py-2 text-center no-print" role="note">
          <strong>Presentation environment.</strong> All records are synthetic sample data. Not connected to {SCHOOL.name} systems.
          {!aiConfigured() && " AI service not configured: AI features show approved material instead."}
        </div>
      )}
      <div className="flex">
        <Sidebar groups={groups} />
        <div className="flex-1 min-w-0">
          <header className="h-14 border-b border-line bg-surface flex items-center justify-between gap-3 px-4 sm:px-6 no-print">
            <Link href="/app" className="lg:hidden" aria-label="Dashboard">
              <ProductMark id="vx-head" />
            </Link>
            <p className="hidden lg:block text-sm text-muted truncate">Proposed solution for {SCHOOL.name}</p>
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-right min-w-0 hidden sm:block">
                <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
              <SignOutButton />
            </div>
          </header>
          <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl print-area">{children}</main>
        </div>
      </div>
    </div>
  );
}
