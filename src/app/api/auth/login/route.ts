import { z } from "zod";
import { attemptLogin, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, body, clientIp, limit, ok, route } from "@/lib/http";

const Login = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

export const POST = route(async (req) => {
  limit(req, "login", 10, 600);
  const { email, password } = await body(req, Login);
  const result = await attemptLogin(email, password);
  const db = await getDb();
  if (!result.ok) {
    await audit(db, null, "auth.login_failed", "user", undefined, { email: email.toLowerCase() }, clientIp(req));
    throw new ApiError(401, result.error);
  }
  await createSession(result.user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
  await audit(db, result.user.id, "auth.login", "user", result.user.id, {}, clientIp(req));
  return ok({ ok: true, role: result.user.role });
});
