import { z } from "zod";
import { automaticRemark, draftRemark, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { assertRemarkAccess, remarkData } from "@/lib/remarks";

const Input = z.object({ studentId: z.coerce.number().int().positive(), examId: z.coerce.number().int().positive() });

/** Drafts a report-card remark for the teacher to edit. Nothing is saved until the teacher saves it. */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  limit(req, `remark:${user.id}`, 30, 600);
  const { studentId, examId } = await body(req, Input);
  const s = await assertRemarkAccess(user, studentId, examId);
  const data = await remarkData(studentId, examId, s.max_marks);
  const firstName = s.name.split(" ")[0];
  const out = await withFallback(
    () => draftRemark({ userKey: String(user.id), firstName, level: s.level, summary: data.summary }),
    () => automaticRemark(firstName, data.subjects),
  );
  await logAi(user, "remark_draft", out.mode, "student", studentId, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});
