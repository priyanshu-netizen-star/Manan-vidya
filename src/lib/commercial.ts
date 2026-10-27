/**
 * Commercial terms of the proposal. These figures are fixed by the proposal and must not be
 * changed without a written agreement. tests/commercial.test.ts asserts every total.
 */

export const PROJECT_FEE = 350000;
export const DURATION_WEEKS = 12;

export const BUDGET_LINES = [
  { item: "Discovery, requirements and solution design", amount: 20000 },
  { item: "AI-powered learning pilot", amount: 80000 },
  { item: "ERP workflow and administration automation", amount: 75000 },
  { item: "AI admissions assistant and lead tracking", amount: 60000 },
  { item: "Digital hostel management", amount: 55000 },
  { item: "Testing, training, documentation and handover", amount: 25000 },
  { item: "Project coordination and initial support", amount: 20000 },
] as const;

export const MILESTONES = [
  { label: "Project start", percent: 40, amount: 140000, trigger: "On signing the agreement and project kick-off" },
  { label: "Core pilot review", percent: 30, amount: 105000, trigger: "AI learning pilot and admissions assistant reviewed by the school" },
  { label: "Module review", percent: 20, amount: 70000, trigger: "Administration and hostel modules reviewed by the school" },
  { label: "Final handover", percent: 10, amount: 35000, trigger: "Training, documentation and handover completed" },
] as const;

export const EXCLUSIONS = [
  "Hardware of any kind (computers, tablets, robotics kits, sensors, networking or biometric devices).",
  "External subscriptions and hosting or database plans, unless agreed in writing.",
  "AI / API consumption charges (for example Claude API usage), billed by the provider on actual use.",
  "SMS, WhatsApp or other messaging charges.",
  "Third-party ERP licences, vendor integration fees or vendor API access charges.",
  "Data migration from existing systems beyond what is agreed in writing.",
  "Physical robotics workshops, on-site trainers, or equipment procurement.",
  "Any other cost not explicitly agreed in writing.",
] as const;

export const budgetTotal = () => BUDGET_LINES.reduce((s, l) => s + l.amount, 0);

/**
 * RECONCILIATION REQUIRED: the proposal's line items (as supplied) add up to ₹3,35,000, while the
 * stated project fee and the payment milestones total ₹3,50,000. Neither figure has been changed.
 * The ₹15,000 difference is shown everywhere as "not yet allocated" until VoxVision decides how
 * to reconcile it (adjust a line item, or add a line). Update BUDGET_LINES and this note together.
 */
export const unallocatedAmount = () => PROJECT_FEE - budgetTotal();
export const UNALLOCATED_NOTE =
  "Not yet allocated to a line item. The listed line items total ₹3,35,000 against the ₹3,50,000 project fee; VoxVision will reconcile this ₹15,000 before the proposal is issued.";
export const milestoneTotal = () => MILESTONES.reduce((s, m) => s + m.amount, 0);
export const milestonePercentTotal = () => MILESTONES.reduce((s, m) => s + m.percent, 0);

/** Indian digit grouping: 350000 -> "₹3,50,000". */
export function formatINR(amount: number): string {
  const digits = Math.round(Math.abs(amount)).toString();
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${amount < 0 ? "-" : ""}₹${grouped}`;
}

export const TIMELINE = [
  { weeks: "1–2", phase: "Discovery and design", work: "Requirement workshops, review of the school's existing software, data-protection plan, sign-off of scope and acceptance criteria.", payment: "40% at project start" },
  { weeks: "3–5", phase: "AI learning pilot", work: "Subjects and topics set up, approved materials loaded with teachers, quizzes and the teacher workspace live for pilot classes.", payment: "" },
  { weeks: "5–6", phase: "Admissions assistant", work: "School-verified knowledge base in English and Hindi, enquiry tracking and the staff follow-up workflow.", payment: "30% at core pilot review" },
  { weeks: "6–8", phase: "Administration workflows", work: "Student records, attendance, marks and report cards, tasks and reports. ERP integration only where compatibility is confirmed.", payment: "" },
  { weeks: "8–10", phase: "Hostel management", work: "Rooms and beds, leave and outpass approvals, roll-call, maintenance requests.", payment: "20% at module review" },
  { weeks: "10–11", phase: "Testing and training", work: "User acceptance testing with staff, security review, training sessions for each role.", payment: "" },
  { weeks: "12", phase: "Handover", work: "Go-live readiness check, documentation, handover and start of initial support.", payment: "10% at final handover" },
] as const;
