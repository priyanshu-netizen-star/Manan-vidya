import Link from "next/link";
import { Download } from "lucide-react";
import { AskData } from "@/components/ai/AskData";
import { Card, EmptyState, PageHeader, SampleDataTag } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation, withBase } from "@/lib/config";
import { REPORTS, runReport, type ReportName } from "@/lib/reports";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requirePageUser("reports.view");
  const sp = await searchParams;
  const name = (sp.r && sp.r in REPORTS ? sp.r : "class-strength") as ReportName;
  const report = await runReport(name);
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Reports" description="Standard administrative reports. Every report can be downloaded as a spreadsheet (CSV)." actions={isPresentation() ? <SampleDataTag /> : undefined} />
      <section className="ai-card p-5 mb-5">
        <h2 className="font-bold text-[0.9rem] flex items-center gap-2 mb-3"><span className="ai-chip">AI</span> Ask your data</h2>
        <AskData />
      </section>
      <div className="grid lg:grid-cols-[16rem_1fr] gap-5 items-start">
        <Card pad={false}>
          <ul className="p-2">
            {(Object.keys(REPORTS) as ReportName[]).map((r) => (
              <li key={r}>
                <Link href={`/app/reports?r=${r}`} aria-current={r === name ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm ${r === name ? "bg-brand/10 text-brand font-semibold" : "hover:bg-surface-2"}`}>{REPORTS[r]}</Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title={report.title}
          actions={<a href={withBase(`/api/reports/${name}`)} className="btn btn-secondary btn-sm" download><Download className="w-3.5 h-3.5" aria-hidden /> CSV</a>}
          pad={false}
        >
          <p className="px-5 pb-3 text-sm text-muted">{report.description}</p>
          <div className="px-5 pb-4"><AskData key={name} report={name} /></div>
          {report.rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr>{report.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i}>{row.map((c, j) => <td key={j} className={typeof c === "number" ? "tabular-nums" : ""}>{c ?? "—"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nothing to report" />
          )}
        </Card>
      </div>
    </div>
  );
}
