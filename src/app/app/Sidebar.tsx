"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { ProductMark } from "@/components/Logo";
import { api } from "@/components/forms";
import type { NavGroup } from "@/lib/nav";

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const current = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  const active = (href: string) => href === current;

  const nav = (
    <nav aria-label="Application" className="px-3 py-4 space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 mb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={active(i.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-1.5 text-sm ${active(i.href) ? "bg-brand/10 text-brand font-semibold" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <p className="px-3 mb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted">Help</p>
        <Link href="/guide" className="block rounded-lg px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">User guides</Link>
        <Link href="/" className="block rounded-lg px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">Proposal overview</Link>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-line bg-surface min-h-screen sticky top-0 self-start max-h-screen overflow-y-auto no-print">
        <div className="h-14 flex items-center px-6 border-b border-line">
          <Link href="/app" aria-label="Dashboard"><ProductMark id="vx-side" /></Link>
        </div>
        {nav}
      </aside>
      <button
        type="button"
        className="lg:hidden fixed bottom-4 right-4 z-40 btn btn-primary rounded-full shadow-lg no-print"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="w-4 h-4" aria-hidden /> Menu
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-surface h-full overflow-y-auto shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-line">
              <ProductMark id="vx-menu" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-2"><X className="w-5 h-5" /></button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await api("POST", "/api/auth/logout", {}).catch(() => undefined);
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="w-3.5 h-3.5" aria-hidden /> Sign out
    </button>
  );
}
