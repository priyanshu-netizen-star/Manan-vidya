"use client";

import Link from "next/link";

/** Generic error screen. Details are logged on the server, never shown to the user. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold font-display">Something went wrong</h1>
        <p className="text-ink-2 mt-2">Please try again. If the problem continues, contact the school&apos;s system administrator.</p>
        <div className="flex gap-2 justify-center mt-5">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/app" className="btn btn-secondary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
