import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { apiUser, body, clientIp, ok, route } from "@/lib/http";
import { KbInput } from "@/lib/schemas";


export const POST = route(async (req) => {
  const user = await apiUser(req, "kb.manage");
  const k = await body(req, KbInput);
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    `INSERT INTO kb_entries (category, question_en, answer_en, question_hi, answer_hi, keywords, source, verification, hindi_reviewed, published, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [k.category, k.question_en, k.answer_en, k.question_hi, k.answer_hi, k.keywords, k.source, k.verification, k.hindi_reviewed && !!k.answer_hi, k.published, user.id],
  );
  await audit(db, user.id, "kb.create", "kb_entry", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
