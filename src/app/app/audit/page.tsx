import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  await requirePageUser("audit.view");
  const sp = await searchParams;
  const area = /^[a-z_]{2,20}$/.test(sp.area ?? "") ? sp.area! : "";
  const db = await getDb();
  const areas = await db.query<{ area: string; n: number }>("SELECT split_part(action, '.', 1) AS area, count(*)::int AS n FROM audit_log GROUP BY 1 ORDER BY 1");
  const rows = await db.query<{ id: number; action: string; entity: string | null; entity_id: string | null; detail: Record<string, unknown>; ip: string | null; created_at: string; actor: string | null }>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.ip, a.created_at, u.name AS actor
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
      WHERE ($1 = '' OR a.action LIKE $1 || '.%') ORDER BY a.created_at DESC, a.id DESC LIMIT 300`,
    [area],
  );
  return (
    <div>
      <PageHeader eyebrow="Platform" title="Audit log" description="Who did what, and when. Personal data is not copied into the log; it records actions and record references." />
      <div className="flex flex-wrap gap-1.5 mb-4">
        <a href="?" className={`btn btn-sm ${!area ? "btn-primary" : "btn-secondary"}`}>All</a>
        {areas.map((a) => <a key={a.area} href={`?area=${a.area}`} className={`btn btn-sm ${area === a.area ? "btn-primary" : "btn-secondary"}`}>{a.area} ({a.n})</a>)}
      </div>
      <Card pad={false}>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                    <td className="text-sm">{r.actor ?? <span className="text-muted">Public / system</span>}</td>
                    <td className="font-mono text-xs">{r.action}</td>
                    <td className="text-xs">{r.entity ? `${r.entity} #${r.entity_id}` : "—"}</td>
                    <td className="text-xs text-muted font-mono break-all max-w-xs">{Object.keys(r.detail ?? {}).length ? JSON.stringify(r.detail) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No entries" />}
      </Card>
    </div>
  );
}
