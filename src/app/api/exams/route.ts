import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { apiUser, body, clientIp, ok, route } from "@/lib/http";
import { optionalDate } from "@/lib/schemas";

const Exam = z.object({
  name: z.string().trim().min(3).max(100),
  classId: z.coerce.number().int().positive(),
  heldOn: optionalDate,
  maxMarks: z.coerce.number().int().min(5).max(200),
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "exams.manage");
  const e = await body(req, Exam);
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    "INSERT INTO exams (name, class_id, held_on, max_marks, status) VALUES ($1,$2,$3,$4,'open') RETURNING id",
    [e.name, e.classId, e.heldOn, e.maxMarks],
  );
  await audit(db, user.id, "exam.create", "exam", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
