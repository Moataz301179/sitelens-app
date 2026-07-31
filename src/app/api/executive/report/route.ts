import { engine } from "@/lib/executive-team/autonomy/engine";
import { buildExecutiveContext } from "@/lib/executive-team/shared/context-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/executive/report — build & return the daily executive report.
 * This is the user's explicit "daily report of performance, issues, enhancements,
 * results, effects measurement". It also writes a Markdown copy to /generated.
 */
export async function GET() {
  try {
    const report = await engine.emitDailyReport();
    return Response.json(report);
  } catch (err) {
    // If the engine has no run yet, build one ad-hoc from a fresh context.
    try {
      const ctx = buildExecutiveContext();
      const { coordinator } = await import("@/lib/executive-team/coordinator/coordinator");
      const run = await coordinator.runCrew({ context: ctx, autoApprove: true });
      const { dailyReportBuilder } = await import("@/lib/executive-team/reporting/daily-report");
      return Response.json(dailyReportBuilder.build(run));
    } catch (e2) {
      return Response.json({ error: e2 instanceof Error ? e2.message : String(e2) }, { status: 500 });
    }
  }
}
