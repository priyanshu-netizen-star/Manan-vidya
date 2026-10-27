import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, clientIp, route } from "@/lib/http";
import { REPORTS, runReport, toCsv, type ReportName } from "@/lib/reports";

/** CSV download of an administrative report. */
export const GET = route(async (req, ctx) => {
  const user = await apiUser(req, "reports.view");
  const name = (await ctx.params).name.replace(/\.csv$/, "");
  if (!(name in REPORTS)) throw new ApiError(404, "Unknown report");
  const report = await runReport(name as ReportName);
  await audit(await getDb(), user.id, "report.export", "report", name, { rows: report.rows.length }, clientIp(req));
  return new Response("﻿" + toCsv(report), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
});
