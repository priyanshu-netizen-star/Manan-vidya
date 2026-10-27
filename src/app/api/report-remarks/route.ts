import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { apiUser, body, clientIp, ok, route } from "@/lib/http";
import { assertRemarkAccess } from "@/lib/remarks";

const Input = z.object({
  studentId: z.coerce.number().int().positive(),
  examId: z.coerce.number().int().positive(),
  remark: z.string().trim().min(5).max(600),
  approve: z.coerce.boolean().default(false),
  aiAssisted: z.coerce.boolean().default(false),
});

/** Saves a report-card remark. Families see it only once a teacher approves it. */
export const PUT = route(async (req) => {
  const user = await apiUser(req);
  const input = await body(req, Input);
  await assertRemarkAccess(user, input.studentId, input.examId);
  const db = await getDb();
  const status = input.approve ? "approved" : "draft";
  await db.query(
    `INSERT INTO report_remarks (exam_id, student_id, remark, status, ai_assisted, updated_by) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (exam_id, student_id) DO UPDATE SET remark = EXCLUDED.remark, status = EXCLUDED.status,
       ai_assisted = report_remarks.ai_assisted OR EXCLUDED.ai_assisted, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [input.examId, input.studentId, input.remark, status, input.aiAssisted, user.id],
  );
  await audit(db, user.id, `remark.${status}`, "student", input.studentId, { examId: input.examId, aiAssisted: input.aiAssisted }, clientIp(req));
  return ok({ status });
});
