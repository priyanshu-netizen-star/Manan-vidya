import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, SampleDataTag, StatusBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";
import { fmtDate, todayIST } from "@/lib/dates";
import { ENQUIRY_LABEL, ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/workflows";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; view?: string }> }) {
  await requirePageUser("enquiry.manage");
  const sp = await searchParams;
  const status = ENQUIRY_STATUSES.includes(sp.status as EnquiryStatus) ? sp.status! : "";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const view = ["due", "escalated", "unassigned"].includes(sp.view ?? "") ? sp.view! : "";
  const today = todayIST();
  const db = await getDb();
  const rows = await db.query<{
    id: number; ref_code: string; parent_name: string; child_name: string; grade_sought: string; boarding_interest: string; status: EnquiryStatus;
    escalated: boolean; next_follow_up: string | null; assignee: string | null; created_at: string; source: string; language: string;
  }>(
    `SELECT e.id, e.ref_code, e.parent_name, e.child_name, e.grade_sought, e.boarding_interest, e.status, e.escalated, e.next_follow_up,
            u.name AS assignee, e.created_at, e.source, e.language
       FROM enquiries e LEFT JOIN users u ON u.id = e.assigned_to
      WHERE ($1 = '' OR e.status = $1)
        AND ($2 = '' OR e.parent_name ILIKE '%' || $2 || '%' OR e.child_name ILIKE '%' || $2 || '%' OR e.ref_code ILIKE '%' || $2 || '%' OR e.phone LIKE '%' || $2 || '%')
        AND ($3 <> 'due' OR (e.next_follow_up <= $4 AND e.status NOT IN ('admitted','closed')))
        AND ($3 <> 'escalated' OR (e.escalated AND e.status NOT IN ('admitted','closed')))
        AND ($3 <> 'unassigned' OR e.assigned_to IS NULL)
      ORDER BY e.escalated DESC, (e.next_follow_up IS NULL), e.next_follow_up, e.created_at DESC LIMIT 300`,
    [status, q, view, today],
  );
  const counts = await db.query<{ status: EnquiryStatus; n: number }>("SELECT status, count(*)::int AS n FROM enquiries GROUP BY status");
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Admissions"
        title="Enquiries"
        description="Every enquiry from the website form and the assistant, with its follow-up date and owner. Escalated enquiries need a personal reply."
        actions={isPresentation() ? <SampleDataTag /> : undefined}
      />
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href="/app/enquiries" className={`btn btn-sm ${!status && !view ? "btn-primary" : "btn-secondary"}`}>All</Link>
        <Link href="/app/enquiries?view=due" className={`btn btn-sm ${view === "due" ? "btn-primary" : "btn-secondary"}`}>Follow-up due</Link>
        <Link href="/app/enquiries?view=escalated" className={`btn btn-sm ${view === "escalated" ? "btn-primary" : "btn-secondary"}`}>Escalated</Link>
        <Link href="/app/enquiries?view=unassigned" className={`btn btn-sm ${view === "unassigned" ? "btn-primary" : "btn-secondary"}`}>Unassigned</Link>
        {ENQUIRY_STATUSES.map((s) => (
          <Link key={s} href={`/app/enquiries?status=${s}`} className={`btn btn-sm ${status === s ? "btn-primary" : "btn-secondary"}`}>
            {ENQUIRY_LABEL[s]} ({countOf(s)})
          </Link>
        ))}
      </div>
      <form method="get" className="mb-4 flex gap-2 max-w-md">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="enq-q" className="sr-only">Search</label>
        <input id="enq-q" name="q" defaultValue={q} className="input" placeholder="Search name, reference or phone" />
        <button className="btn btn-secondary">Search</button>
      </form>
      <Card pad={false}>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Reference</th><th>Parent / child</th><th>Class</th><th>Status</th><th>Follow-up</th><th>Owner</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const overdue = r.next_follow_up && r.next_follow_up < today && !["admitted", "closed"].includes(r.status);
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/app/enquiries/${r.id}`} className="font-semibold text-brand">{r.ref_code}</Link>
                        <p className="text-xs text-muted">{fmtDate(r.created_at)} · {r.source === "assistant" ? "assistant" : "web form"}{r.language === "hi" ? " · Hindi" : ""}</p>
                      </td>
                      <td>{r.parent_name}<p className="text-xs text-muted">{r.child_name}</p></td>
                      <td>{r.grade_sought}<p className="text-xs text-muted capitalize">{r.boarding_interest}</p></td>
                      <td>
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={r.status} label={ENQUIRY_LABEL[r.status]} />
                          {r.escalated && <Badge tone="bad">Needs staff reply</Badge>}
                        </div>
                      </td>
                      <td className={overdue ? "text-bad font-semibold" : ""}>{r.next_follow_up ? fmtDate(r.next_follow_up) : "—"}{overdue ? " (overdue)" : ""}</td>
                      <td>{r.assignee ?? <span className="text-muted">Unassigned</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No enquiries match" />
        )}
      </Card>
    </div>
  );
}
