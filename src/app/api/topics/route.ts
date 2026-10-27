import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";

const Topic = z.object({
  subjectId: z.coerce.number().int().positive(),
  classLevel: z.coerce.number().int().min(1).max(12),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(400).default(""),
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "content.manage");
  const t = await body(req, Topic);
  const db = await getDb();
  if (user.role === "teacher") {
    const allowed = await db.one<{ ok: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM teaching_assignments ta JOIN classes c ON c.id = ta.class_id
                       WHERE ta.teacher_id = $1 AND ta.subject_id = $2 AND c.level = $3) AS ok`,
      [user.id, t.subjectId, t.classLevel],
    );
    if (!allowed?.ok) throw new ApiError(403, "You can only add topics for subjects and classes you teach.");
  }
  const dup = await db.one("SELECT id FROM topics WHERE subject_id = $1 AND class_level = $2 AND lower(name) = lower($3)", [t.subjectId, t.classLevel, t.name]);
  if (dup) throw new ApiError(409, "A topic with this name already exists for that subject and class.");
  const row = await db.one<{ id: number }>(
    "INSERT INTO topics (subject_id, class_level, name, summary, position) VALUES ($1,$2,$3,$4,(SELECT coalesce(max(position),0)+1 FROM topics)) RETURNING id",
    [t.subjectId, t.classLevel, t.name, t.summary],
  );
  await audit(db, user.id, "topic.create", "topic", row!.id, { name: t.name }, clientIp(req));
  return ok({ id: row!.id }, 201);
});
