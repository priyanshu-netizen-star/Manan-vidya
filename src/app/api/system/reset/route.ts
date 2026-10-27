import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, clientIp, limit, ok, route } from "@/lib/http";
import { seedDatabase, wipeDatabase } from "@/lib/seed";

/**
 * Restores the synthetic presentation data. Only in the presentation environment and only for
 * the platform administrator. This endpoint does not exist in production mode.
 */
export const POST = route(async (req) => {
  if (!isPresentation()) throw new ApiError(404, "Not found");
  await apiUser(req, "system.reset");
  limit(req, "reset", 3, 600);
  const db = await getDb();
  await wipeDatabase(db);
  await seedDatabase(db);
  await db.query("INSERT INTO audit_log (action, detail, ip) VALUES ('system.reset', '{}', $1)", [clientIp(req)]);
  return ok();
});
