import { z } from "zod";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { ApiError, body, clientIp, limit, ok, route } from "@/lib/http";
import { SEED_ACCOUNTS } from "@/lib/seed";

/** One-click role sign-in. Only exists in the presentation environment (synthetic data). */
const Pick = z.object({ account: z.enum(SEED_ACCOUNTS.map((a) => a.key) as [string, ...string[]]) });

export const POST = route(async (req) => {
  if (!isPresentation()) throw new ApiError(404, "Not found");
  limit(req, "presentation-login", 60, 600);
  const { account } = await body(req, Pick);
  const email = SEED_ACCOUNTS.find((a) => a.key === account)!.email;
  const db = await getDb();
  const user = await db.one<{ id: number; role: string }>("SELECT id, role FROM users WHERE email = $1 AND active AND seeded", [email]);
  if (!user) throw new ApiError(404, "Presentation account not found. Reset the presentation data.");
  await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
  await audit(db, user.id, "auth.presentation_login", "user", user.id, {}, clientIp(req));
  return ok({ ok: true, role: user.role });
});
