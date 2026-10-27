import Link from "next/link";
import { ProductMark } from "@/components/Logo";
import { PUBLIC_DOCS } from "@/lib/docs";

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="bg-surface border-b border-line no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Proposal overview"><ProductMark /></Link>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-secondary btn-sm hidden sm:inline-flex">Proposal</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Open the application</Link>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[16rem_1fr] gap-8">
        <nav aria-label="Documentation" className="no-print">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Documentation</p>
          <ul className="space-y-0.5">
            <li><Link href="/guide" className="block rounded-lg px-3 py-1.5 text-sm hover:bg-surface-2">Overview</Link></li>
            {PUBLIC_DOCS.map((d) => (
              <li key={d.slug}><Link href={`/guide/${d.slug}`} className="block rounded-lg px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">{d.title}</Link></li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
