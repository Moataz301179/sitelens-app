import { coordinator } from "@/lib/executive-team/coordinator/coordinator";
import { buildExecutiveContext } from "@/lib/executive-team/shared/context-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/executive/run — run the full executive crew once and return the run.
 * GET  /api/executive/run — return the last crew run (if any).
 */
export async function POST(req: Request) {
  let seed: Record<string, number> = {};
  try {
    const body = await req.json();
    seed = body?.seed ?? {};
  } catch { /* no body */ }

  try {
    const ctx = buildExecutiveContext(seed);
    const run = await coordinator.runCrew({ context: ctx, autoApprove: true, autoApproveConfidence: 0.7 });
    return Response.json({
      id: run.id,
      timestamp: run.timestamp,
      summary: run.summary,
      decisions: run.decisions.length,
      insights: run.insights.length,
      actionItems: run.actionItems.length,
      approved: run.decisions.filter((d) => d.approved).length,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  const runs = (await import("@/lib/executive-team/shared/executive-state")).executiveState.getRuns();
  const last = runs[runs.length - 1];
  if (!last) return Response.json({ message: "No run yet. POST to trigger one." });
  return Response.json({ id: last.id, timestamp: last.timestamp, summary: last.summary, decisions: last.decisions.length });
}
