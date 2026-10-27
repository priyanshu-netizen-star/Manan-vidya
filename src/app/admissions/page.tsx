import Link from "next/link";
import { ProductMark } from "@/components/Logo";
import { GRADES } from "@/lib/admissions";
import { isPresentation, SCHOOL } from "@/lib/config";
import { AdmissionsAssistant, EnquiryForm, TrackForm } from "./AdmissionsClient";

export const metadata = { title: "Admissions assistant" };

export default function AdmissionsPage() {
  const presentation = isPresentation();
  return (
    <div className="min-h-screen bg-page">
      <header className="bg-surface border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Proposal overview"><ProductMark /></Link>
          <Link href="/login" className="btn btn-secondary btn-sm">Staff sign in</Link>
        </div>
      </header>
      {presentation && (
        <div className="bg-[#1b1530] text-[#e9e6ff] text-xs px-4 py-2.5 text-center" role="note">
          <strong>Presentation version.</strong> Not operated by {SCHOOL.name}. Answers come from the school&apos;s public website and await the school&apos;s confirmation.
          Enquiries entered here are <strong>not</strong> sent to the school. Please use sample details only.
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Admissions help · प्रवेश सहायता</h1>
        <p className="mt-1 text-ink-2 max-w-2xl text-sm">
          Ask about admissions at {SCHOOL.name}, Ranchi, in English or Hindi. The assistant answers only from information the school has published or approved.
          Questions about fees, guarantees, health or safety are passed to a member of staff.
        </p>
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 mt-6 items-start">
          <AdmissionsAssistant />
          <div className="space-y-5">
            <EnquiryForm grades={[...GRADES]} presentation={presentation} />
            <TrackForm />
          </div>
        </div>
      </main>
    </div>
  );
}
