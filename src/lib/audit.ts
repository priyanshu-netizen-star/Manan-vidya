import "server-only";
import type { Queryable } from "./db";

export async function audit(
  q: Queryable,
  actorId: number | null,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail: Record<string, unknown> = {},
  ip?: string,
) {
  await q.query("INSERT INTO audit_log (actor_id, action, entity, entity_id, detail, ip) VALUES ($1,$2,$3,$4,$5,$6)", [
    actorId, action, entity ?? null, entityId == null ? null : String(entityId), JSON.stringify(detail), ip ?? null,
  ]);
}

export async function recordStatus(
  q: Queryable,
  entity: string,
  entityId: number,
  from: string | null,
  to: string | null,
  note: string | null,
  actor: { id: number | null; label: string },
) {
  await q.query(
    "INSERT INTO status_history (entity, entity_id, from_status, to_status, note, actor_id, actor_label) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [entity, entityId, from, to, note, actor.id, actor.label],
  );
}
