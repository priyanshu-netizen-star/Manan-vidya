import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="text-2xl font-bold font-display mt-1">Page not found</h1>
        <p className="text-ink-2 mt-2">The page may have moved, or you may not have access to it.</p>
        <div className="flex gap-2 justify-center mt-5">
          <Link href="/app" className="btn btn-primary">Go to dashboard</Link>
          <Link href="/" className="btn btn-secondary">Proposal overview</Link>
        </div>
      </div>
    </div>
  );
}
