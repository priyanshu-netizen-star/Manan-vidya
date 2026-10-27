import { z } from "zod";
import { draftEnquiryReply, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { decideAssistantReply, type KbEntry } from "@/lib/kb";
import { ENQUIRY_LABEL, type EnquiryStatus } from "@/lib/workflows";

const Input = z.object({ enquiryId: z.coerce.number().int().positive(), lang: z.enum(["en", "hi"]).optional() });

/** Drafts a reply for admissions staff to edit and send themselves. Nothing is sent to the parent. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "enquiry.manage");
  limit(req, `enquiry-reply:${user.id}`, 20, 600);
  const input = await body(req, Input);
  const db = await getDb();
  const e = await db.one<{ id: number; parent_name: string; child_name: string; grade_sought: string; boarding_interest: string; message: string; language: "en" | "hi"; status: EnquiryStatus }>(
    "SELECT id, parent_name, child_name, grade_sought, boarding_interest, message, language, status FROM enquiries WHERE id = $1",
    [input.enquiryId],
  );
  if (!e) throw new ApiError(404, "Enquiry not found.");
  const lang = input.lang ?? e.language;
  const notes = await db.query<{ note: string }>(
    "SELECT note FROM status_history WHERE entity = 'enquiry' AND entity_id = $1 AND note IS NOT NULL ORDER BY created_at DESC LIMIT 5",
    [e.id],
  );
  const entries = await db.query<KbEntry>("SELECT * FROM kb_entries WHERE published ORDER BY id");
  // Facts relevant to the parent's message, plus the core admission facts.
  // Sensitive topics (fees, guarantees, health) are never answered from facts: the draft says the office will confirm.
  const decision = decideAssistantReply(e.message || "admission process documents", entries);
  const relevant = decision.mode === "knowledge_base" ? decision.matches.map((m) => m.entry) : [];
  const core = entries.filter((k) => /admission|document|process|hostel|boarding/i.test(k.category + k.question_en)).slice(0, 4);
  const facts = [...new Map([...relevant, ...core].map((k) => [k.id, k])).values()]
    .map((k) => `- ${k.question_en} ${k.answer_en}${k.verification === "school_confirmed" ? "" : " (from the public website; awaiting school confirmation)"}`)
    .join("\n");
  const enquiry = `Parent: ${e.parent_name}. Child: ${e.child_name}, seeking ${e.grade_sought}, ${e.boarding_interest}.
Current status: ${ENQUIRY_LABEL[e.status]}.
Parent's message: ${e.message || "(none)"}
Staff notes so far: ${notes.map((n) => n.note).join(" | ") || "(none)"}`;
  const out = await withFallback(
    () => draftEnquiryReply({ userKey: String(user.id), lang, enquiry, facts }),
    () => template(e, lang),
  );
  await logAi(user, "enquiry_reply", out.mode, "enquiry", e.id, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});

function template(e: { parent_name: string; child_name: string; grade_sought: string }, lang: "en" | "hi") {
  if (lang === "hi") {
    return `नमस्ते ${e.parent_name} जी,\n\n${e.child_name} के ${e.grade_sought} में प्रवेश के बारे में आपकी पूछताछ के लिए धन्यवाद। हमारी प्रवेश टीम आपसे जल्द ही संपर्क करेगी और आपको विद्यालय आने के लिए आमंत्रित करेगी।\n\nसादर,\nप्रवेश कार्यालय`;
  }
  return `Dear ${e.parent_name},\n\nThank you for your enquiry about admission for ${e.child_name} to ${e.grade_sought}. Our admissions team will contact you shortly to answer your questions and to invite you for a school visit.\n\nWarm regards,\nAdmissions Office`;
}
