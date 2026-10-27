import { z } from "zod";
import { assertTopicManage } from "@/lib/access";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { apiUser, body, clientIp, ok, route } from "@/lib/http";

const Material = z.object({
  topicId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(20).max(20000),
});

/** New material always starts as a draft; students only ever see approved material. */
export const POST = route(async (req) => {
  const user = await apiUser(req, "content.manage");
  const m = await body(req, Material);
  await assertTopicManage(user, m.topicId);
  const db = await getDb();
  const row = await db.one<{ id: number }>(
    "INSERT INTO materials (topic_id, title, body, status, created_by) VALUES ($1,$2,$3,'draft',$4) RETURNING id",
    [m.topicId, m.title, m.body, user.id],
  );
  await audit(db, user.id, "material.create", "material", row!.id, {}, clientIp(req));
  return ok({ id: row!.id }, 201);
});
