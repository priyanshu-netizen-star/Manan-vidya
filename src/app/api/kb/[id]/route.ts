import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, intParam, ok, route } from "@/lib/http";
import { KbInput } from "@/lib/schemas";

export const PATCH = route(async (req, ctx) => {
  const user = await apiUser(req, "kb.manage");
  const id = intParam((await ctx.params).id);
  const k = await body(req, KbInput);
  const db = await getDb();
  const exists = await db.one("SELECT 1 FROM kb_entries WHERE id = $1", [id]);
  if (!exists) throw new ApiError(404, "Entry not found");
  await db.query(
    `UPDATE kb_entries SET category = $2, question_en = $3, answer_en = $4, question_hi = $5, answer_hi = $6, keywords = $7, source = $8,
            verification = $9, hindi_reviewed = $10, published = $11, updated_by = $12, updated_at = now() WHERE id = $1`,
    [id, k.category, k.question_en, k.answer_en, k.question_hi, k.answer_hi, k.keywords, k.source, k.verification, k.hindi_reviewed && !!k.answer_hi, k.published, user.id],
  );
  await audit(db, user.id, "kb.update", "kb_entry", id, { verification: k.verification, published: k.published }, clientIp(req));
  return ok();
});
