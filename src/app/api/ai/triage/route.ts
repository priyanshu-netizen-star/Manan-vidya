import { z } from "zod";
import { keywordTriage, triageMaintenance, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { ApiError, apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { can } from "@/lib/rbac";

const Input = z.object({ description: z.string().trim().min(5).max(1000) });

/** Suggests a category and priority for a maintenance request. The person filing it, and the warden, decide. */
export const POST = route(async (req) => {
  const user = await apiUser(req);
  if (!can(user.role, "hostel.manage") && !can(user.role, "hostel.request")) throw new ApiError(403, "You do not have permission to do this.");
  limit(req, `triage:${user.id}`, 20, 600);
  const { description } = await body(req, Input);
  const out = await withFallback(() => triageMaintenance({ userKey: String(user.id), description }), () => keywordTriage(description));
  await logAi(user, "maintenance_triage", out.mode, undefined, undefined, clientIp(req));
  return ok({ mode: out.mode, notice: out.notice, ...out.result });
});
