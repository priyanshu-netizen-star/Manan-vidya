import { randomInt } from "node:crypto";
import { z } from "zod";
import { audit, recordStatus } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, body, clientIp, limit, ok, route } from "@/lib/http";
import { admissionsSensitivity } from "@/lib/safety";
import { phone } from "@/lib/schemas";
import { GRADES } from "@/lib/admissions";

const Enquiry = z.object({
  parentName: z.string().trim().min(2).max(100),
  phone,
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email().max(200).optional()),
  childName: z.string().trim().min(2).max(100),
  gradeSought: z.enum(GRADES),
  boardingInterest: z.enum(["day", "boarding", "undecided"]).default("undecided"),
  message: z.string().trim().max(1500).default(""),
  language: z.enum(["en", "hi"]).default("en"),
  source: z.enum(["web_form", "assistant"]).default("web_form"),
  consent: z.preprocess((v) => v === true || v === "on" || v === "true", z.literal(true, { message: "Please agree to be contacted about this enquiry." })),
  website: z.string().max(0, "Invalid submission").optional(), // honeypot: real users leave this empty
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const refCode = () => `MV-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

/**
 * Public enquiry submission. Stores only what is needed to follow up. Nothing is sent
 * to the school's own systems; staff work the enquiry inside School OS.
 */
export const POST = route(async (req) => {
  limit(req, "enquiry", 5, 3600);
  const input = await body(req, Enquiry);
  const db = await getDb();
  const sensitive = admissionsSensitivity(input.message);
  let ref = refCode();
  for (let i = 0; i < 5 && (await db.one("SELECT 1 FROM enquiries WHERE ref_code = $1", [ref])); i++) ref = refCode();
  const row = await db.one<{ id: number }>(
    `INSERT INTO enquiries (ref_code, parent_name, phone, email, child_name, grade_sought, boarding_interest, message, language, source, status, escalated, escalation_reason, next_follow_up, consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new',$11,$12,(now() AT TIME ZONE 'Asia/Kolkata')::date + 1,TRUE) RETURNING id`,
    [ref, input.parentName, input.phone, input.email ?? null, input.childName, input.gradeSought, input.boardingInterest, input.message, input.language, input.source, !!sensitive, sensitive],
  );
  if (!row) throw new ApiError(500, "Could not save the enquiry");
  await recordStatus(db, "enquiry", row.id, null, "new", "Enquiry received", { id: null, label: "Parent (web form)" });
  await audit(db, null, "enquiry.create", "enquiry", row.id, { source: input.source }, clientIp(req));
  return ok({ ref }, 201);
});
