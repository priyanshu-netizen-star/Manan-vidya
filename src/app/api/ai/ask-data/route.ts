import { z } from "zod";
import { automaticReportSummary, keywordReport, narrateReport, pickReport, withFallback } from "@/lib/ai-features";
import { logAi } from "@/lib/ai-http";
import { aiConfigured } from "@/lib/config";
import { AiUnavailable } from "@/lib/ai";
import { apiUser, body, clientIp, limit, ok, route } from "@/lib/http";
import { REPORTS, runReport, type ReportName } from "@/lib/reports";

const Input = z.object({
  question: z.string().trim().max(300).default(""),
  report: z.enum(Object.keys(REPORTS) as [ReportName, ...ReportName[]]).optional(),
});

/**
 * "Ask your data": a question is routed to one of the standard reports (never free-form SQL),
 * the report runs with the normal permissions, and the answer is explained in plain English.
 */
export const POST = route(async (req) => {
  const user = await apiUser(req, "reports.view");
  limit(req, `ask-data:${user.id}`, 20, 600);
  const input = await body(req, Input);
  let name: ReportName = input.report ?? keywordReport(input.question);
  let reason = input.report ? "" : "Matched from keywords in your question.";
  if (!input.report && input.question && aiConfigured()) {
    try {
      const pick = await pickReport({ userKey: String(user.id), question: input.question });
      name = pick.report;
      reason = pick.reason;
    } catch (e) {
      if (!(e instanceof AiUnavailable)) throw e;
    }
  }
  const report = await runReport(name);
  const out = await withFallback(
    () => narrateReport({ userKey: String(user.id), question: input.question, report }),
    () => automaticReportSummary(report),
  );
  await logAi(user, "ask_data", out.mode, "report", name, clientIp(req));
  return ok({ mode: out.mode, notice: out.notice, report: name, title: report.title, reason, summary: out.result, head: report.head, rows: report.rows.slice(0, 25), total: report.rows.length });
});
