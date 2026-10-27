import Link from "next/link";
import { ProductMark } from "@/components/Logo";
import { GRADES } from "@/lib/admissions";
import { isPresentation, SCHOOL } from "@/lib/config";
import { AdmissionsAssistant, EnquiryForm, TrackForm } from "./AdmissionsClient";

export const metadata = { title: "Admissions assistant" };

export default function AdmissionsPage() {
  const presentation = isPresentation();
  return (
    <div className="min-h-screen">
      <header className="shell-header sticky top-0 z-30 border-b border-line">
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
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-9 text-white" style={{ background: "linear-gradient(120deg,#1c1640 0%,#3a2b8f 50%,#0f5c63 100%)" }}>
          <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#00cec9]/25 blur-3xl" aria-hidden />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Admissions · {SCHOOL.name}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold font-display tracking-tight">Admissions help · प्रवेश सहायता</h1>
            <p className="mt-3 text-sm sm:text-base text-white/85">
              Ask about admissions at {SCHOOL.name}, Ranchi, in English or Hindi. The assistant answers only from information the school has published or approved.
              Questions about fees, guarantees, health or safety are passed to a member of staff.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {["English and Hindi", "Answers from school-approved facts", "Track your enquiry with a reference"].map((t) => (
                <span key={t} className="rounded-full bg-white/10 border border-white/15 px-3 py-1 backdrop-blur">{t}</span>
              ))}
            </div>
          </div>
        </section>
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
