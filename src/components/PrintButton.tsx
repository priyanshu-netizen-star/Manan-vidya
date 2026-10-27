"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
      <Printer className="w-3.5 h-3.5" aria-hidden /> {label}
    </button>
  );
}
