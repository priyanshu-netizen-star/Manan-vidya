import { z } from "zod";
import { getDb } from "@/lib/db";
import { ApiError, body, limit, ok, route } from "@/lib/http";
import { ENQUIRY_LABEL, type EnquiryStatus } from "@/lib/workflows";

const Track = z.object({ ref: z.string().trim().toUpperCase().regex(/^MV-[A-Z0-9-]{4,12}$/, "Enter the reference shown when you submitted"), phone: z.string().trim().min(10).max(16) });

const NEXT_STEP: Record<EnquiryStatus, string> = {
  new: "The admissions team will contact you soon.",
  contacted: "The admissions team has been in touch. They will tell you about the next step.",
  visit_scheduled: "A visit or interaction has been arranged. Please check the SMS or call from the school for details.",
  application_submitted: "Your application has been received and is being processed by the school.",
  admitted: "Admission is complete. Welcome to the school.",
  closed: "This enquiry is closed. Contact the school office if you need anything else.",
};

const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

/** Parents track an enquiry with the reference AND the phone number used. Staff notes are never returned. */
export const POST = route(async (req) => {
  limit(req, "track", 10, 600);
  const { ref, phone } = await body(req, Track);
  const db = await getDb();
  const e = await db.one<{ id: number; status: EnquiryStatus; phone: string; grade_sought: string; created_at: string }>(
    "SELECT id, status, phone, grade_sought, created_at FROM enquiries WHERE ref_code = $1",
    [ref],
  );
  if (!e || digits(e.phone) !== digits(phone)) throw new ApiError(404, "No enquiry matches that reference and phone number.");
  const history = await db.query<{ to_status: EnquiryStatus; created_at: string }>(
    "SELECT to_status, created_at FROM status_history WHERE entity = 'enquiry' AND entity_id = $1 AND to_status IS NOT NULL ORDER BY created_at",
    [e.id],
  );
  return ok({
    ref,
    status: e.status,
    statusLabel: ENQUIRY_LABEL[e.status],
    nextStep: NEXT_STEP[e.status],
    gradeSought: e.grade_sought,
    submittedAt: e.created_at,
    history: history.map((h) => ({ status: ENQUIRY_LABEL[h.to_status] ?? h.to_status, at: h.created_at })),
  });
});
