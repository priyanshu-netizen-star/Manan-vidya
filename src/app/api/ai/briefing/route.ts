import { automaticBriefing, briefingReply, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { z } from "zod";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { hostelFacts, roleFacts } from "@/lib/insights";
import { menuNames } from "@/lib/nav";
import { can } from "@/lib/rbac";

const Input = z.object({ scope: z.enum(["role", "hostel"]).default("role") });

/** Today's briefing for the signed-in user, from their role-scoped facts only (or hostel facts for hostel staff). */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  limit(req, `briefing:${user.id}`, 10, 600);
  const { scope } = await body(req, Input);
  const hostel = scope === "hostel" && (can(user.role, "hostel.view") || can(user.role, "hostel.manage"));
  const facts = hostel ? await hostelFacts() : await roleFacts(user);
  const out = await withFallback(
    () => briefingReply({ userKey: String(user.id), role: user.role, firstName: user.name.split(" ")[0], facts, pages: menuNames(user.role) }),
    () => automaticBriefing(facts),
  );
  await logAi(user, "briefing", out.mode, undefined, undefined, clientIp(req));
  return ok({ mode: out.mode, text: out.result, notice: out.notice });
});
