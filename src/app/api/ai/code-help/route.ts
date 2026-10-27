import { z } from "zod";
import { codeHint, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";

const Input = z.object({
  slug: z.string().trim().min(1).max(80),
  code: z.string().max(8000),
  result: z.string().max(3000).default(""),
});

/** AI coding tutor: explains errors and suggests a next step without writing the solution. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "coding.use");
  limit(req, `code-help:${user.id}`, 20, 600);
  const input = await body(req, Input);
  const db = await getDb();
  const c = await db.one<{ id: number; title: string; kind: string; prompt: string; hint: string }>(
    "SELECT id, title, kind, prompt, hint FROM coding_challenges WHERE slug = $1",
    [input.slug],
  );
  if (!c) throw new ApiError(404, "Challenge not found.");
  if (c.kind === "mcq") throw new ApiError(400, "The tutor helps with code challenges, not quiz questions.");
  const out = await withFallback(
    () => codeHint({ userKey: String(user.id), kind: c.kind, title: c.title, prompt: c.prompt, code: input.code, result: input.result, hint: c.hint }),
    () => `**Teacher's hint:** ${c.hint || "Read the task again and test one small piece at a time."}\n\n- Read the first failing check: it shows what your code returned and what was expected.\n- Add a \`print\` (Python) or \`console.log\` (JavaScript) to see values as your code runs.`,
  );
  await logAi(user, "code_help", out.mode, "coding_challenge", c.id, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});
