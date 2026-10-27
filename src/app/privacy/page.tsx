import Link from "next/link";
import { ProductMark } from "@/components/Logo";
import { PRODUCT, SCHOOL, isPresentation } from "@/lib/config";

export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="bg-surface border-b border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center"><Link href="/"><ProductMark /></Link></div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 prose-school">
        <h1>Privacy notice</h1>
        {isPresentation() && (
          <p><strong>This is the presentation environment of a proposal by {PRODUCT.vendor}.</strong> It is not operated by {SCHOOL.name} and contains only synthetic sample records. Please do not enter real personal information.</p>
        )}
        <h2>What this application stores</h2>
        <ul>
          <li><strong>Accounts:</strong> name, email, role, a securely hashed password, and sign-in sessions (a single essential cookie, used only to keep you signed in).</li>
          <li><strong>School records</strong> (once the school authorises use): student details, attendance, marks, learning activity and hostel requests, visible only to the roles that need them.</li>
          <li><strong>Admission enquiries:</strong> the details a parent submits, used only to respond to that enquiry.</li>
          <li><strong>Assistant questions:</strong> the text of questions asked to the admissions assistant, without any identity, so staff can improve answers.</li>
          <li><strong>Audit log:</strong> which account performed which action and when, for accountability.</li>
        </ul>
        <h2>What it does not do</h2>
        <ul>
          <li>No advertising, tracking or analytics cookies.</li>
          <li>No sale or sharing of data with third parties.</li>
          <li>No automated decisions about admissions, discipline, welfare or hostel requests: a staff member decides.</li>
        </ul>
        <h2>AI processing</h2>
        <p>
          If the school enables AI features, the text of a question and the relevant school-approved material are sent to the AI provider (Anthropic) to generate a response.
          Students are told not to enter personal details, and messages that indicate a child may be at risk are not sent to the AI or stored.
        </p>
        <h2>Before use with real data</h2>
        <p>
          The school, as the organisation responsible for its students&apos; data, will approve a data-protection plan consistent with India&apos;s Digital Personal Data Protection Act, 2023,
          including verifiable parental consent for children&apos;s data, retention periods, and how parents can access or correct information. Until then this application holds synthetic data only.
        </p>
        <h2>Contact</h2>
        <p>Questions about this proposal: {PRODUCT.vendor}, <a href={`mailto:${PRODUCT.vendorEmail}`}>{PRODUCT.vendorEmail}</a>.</p>
      </main>
    </div>
  );
}
