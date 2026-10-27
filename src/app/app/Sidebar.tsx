"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, HelpCircle, LogOut, Menu, Presentation, X } from "lucide-react";
import { ProductMark } from "@/components/Logo";
import { api } from "@/components/forms";
import { NAV_ICONS as ICONS } from "@/components/navIcons";
import type { NavGroup } from "@/lib/nav";

function useActive(groups: NavGroup[]) {
  const pathname = usePathname();
  const current = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  return { pathname, active: (href: string) => href === current };
}

function NavList({ groups }: { groups: NavGroup[] }) {
  const { active } = useActive(groups);
  const link = "nav-link flex items-center gap-2.5 rounded-lg px-3 py-[0.42rem] text-[0.84rem] transition-colors";
  return (
    <nav aria-label="Application" className="px-3 py-4 space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="nav-label px-3 mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em]">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const Icon = ICONS[i.icon] ?? FileText;
              return (
                <li key={i.href}>
                  <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`${link} ${active(i.href) ? "font-semibold" : ""}`}>
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="truncate">{i.label}</span>
                    {i.icon === "sparkles" && <span className="ml-auto ai-chip !text-[0.6rem] !px-1.5">AI</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div>
        <p className="nav-label px-3 mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em]">Help</p>
        <Link href="/guide" className={link}><HelpCircle className="w-4 h-4" aria-hidden /> User guides</Link>
        <Link href="/" className={link}><Presentation className="w-4 h-4" aria-hidden /> Proposal overview</Link>
      </div>
    </nav>
  );
}

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  return (
    <aside className="shell-sidebar hidden lg:flex flex-col w-64 shrink-0 min-h-screen sticky top-0 self-start max-h-screen overflow-y-auto no-print">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Link href="/app" aria-label="Dashboard"><ProductMark dark id="vx-side" /></Link>
      </div>
      <NavList groups={groups} />
      <p className="mt-auto px-6 py-4 text-[0.68rem] text-[#6f6a90] border-t border-white/5">© VoxVision · Proposed solution</p>
    </aside>
  );
}

export function MobileMenu({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  return (
    <>
      <button
        type="button"
        className="lg:hidden btn btn-secondary btn-sm no-print"
        onClick={() => setOpenOn(pathname)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="w-4 h-4" aria-hidden /> Menu
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpenOn(null)} />
          <div className="shell-sidebar relative w-72 max-w-[85vw] h-full overflow-y-auto shadow-2xl animate-in">
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
              <ProductMark dark id="vx-menu" />
              <button type="button" onClick={() => setOpenOn(null)} aria-label="Close menu" className="p-2 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <NavList groups={groups} />
          </div>
        </div>
      )}
    </>
  );
}

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm ${compact ? "!px-2" : ""}`}
      aria-label="Sign out"
      onClick={async () => {
        await api("POST", "/api/auth/logout", {}).catch(() => undefined);
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="w-3.5 h-3.5" aria-hidden /> <span className={compact ? "sr-only sm:not-sr-only" : ""}>Sign out</span>
    </button>
  );
}
