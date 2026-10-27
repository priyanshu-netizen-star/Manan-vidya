/**
 * Child-safety screening for free-text student input and admissions questions.
 * Screening routes conversations to humans; it never makes decisions about a child.
 */

const WELLBEING = [
  "suicide", "kill myself", "end my life", "want to die", "self harm", "self-harm", "hurt myself", "cut myself",
  "abuse", "abused", "touched me", "bullied", "bullying", "being beaten", "ragging", "harass",
  "आत्महत्या", "मरना चाहता", "मरना चाहती", "खुद को चोट", "मारपीट", "उत्पीड़न", "धमकाते", "रैगिंग",
];

const ADMISSIONS_SENSITIVE: { reason: string; terms: string[] }[] = [
  { reason: "Fees and payments are confirmed only by the school office.", terms: ["fee", "fees", "cost", "charges", "payment", "refund", "deposit", "scholarship", "concession", "discount", "donation", "capitation", "फीस", "शुल्क", "रिफंड", "छात्रवृत्ति", "छूट", "दान"] },
  { reason: "Admission decisions are made only by the school.", terms: ["guarantee", "guaranteed", "confirm seat", "seat confirmed", "sure admission", "पक्का", "गारंटी"] },
  { reason: "Health, disability and special-needs questions need a conversation with school staff.", terms: ["medical", "medicine", "allergy", "disability", "special needs", "autism", "adhd", "illness", "बीमारी", "दवा", "विकलांग"] },
  { reason: "Safety concerns and complaints must be handled by school staff.", terms: ["complaint", "complain", "safety", "unsafe", "injury", "injured", "police", "legal", "शिकायत", "सुरक्षा", "चोट"] },
];

export type ScreenResult =
  | { kind: "ok" }
  | { kind: "wellbeing" }
  | { kind: "personal_info" }
  | { kind: "too_long" };

export function screenStudentInput(text: string): ScreenResult {
  const t = text.toLowerCase();
  if (text.length > 1000) return { kind: "too_long" };
  if (WELLBEING.some((w) => t.includes(w))) return { kind: "wellbeing" };
  if (/\b\d{10}\b/.test(t) || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return { kind: "personal_info" };
  return { kind: "ok" };
}

export function admissionsSensitivity(text: string): string | null {
  const t = text.toLowerCase();
  if (WELLBEING.some((w) => t.includes(w))) return "This sounds like a welfare or safety matter. A member of school staff must handle it personally.";
  for (const group of ADMISSIONS_SENSITIVE) {
    if (group.terms.some((term) => new RegExp(`(^|[^\\p{L}])${term}`, "u").test(t))) return group.reason;
  }
  return null;
}

export const WELLBEING_MESSAGE = {
  en: "It sounds like something important is worrying you. Please talk to a teacher, your class teacher, the hostel warden or a parent today: you do not have to handle this alone. In India you can also call CHILDLINE on 1098 (free, 24 hours). This learning assistant cannot help with this, and your message has not been saved.",
  hi: "लगता है कि कोई ज़रूरी बात आपको परेशान कर रही है। कृपया आज ही किसी शिक्षक, क्लास टीचर, हॉस्टल वार्डन या माता-पिता से बात करें। आप भारत में चाइल्डलाइन 1098 (निःशुल्क, 24 घंटे) पर भी कॉल कर सकते हैं। यह सहायक इसमें मदद नहीं कर सकता और आपका संदेश सहेजा नहीं गया है।",
};
