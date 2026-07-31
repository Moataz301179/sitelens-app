import { engine } from "@/lib/executive-team/autonomy/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/executive/status      → engine status (running, ticks, counts).
 * POST /api/executive/status      → { action: "start"|"stop"|"tick"|"report" }.
 */
export async function GET() {
  engine.maybeAutoStart();
  return Response.json(engine.getStatus());
}

export async function POST(req: Request) {
  let action = "tick";
  try {
    const body = await req.json();
    action = body?.action ?? "tick";
  } catch { /* default tick */ }

  switch (action) {
    case "start":
      engine.start();
      return Response.json({ ok: true, status: engine.getStatus() });
    case "stop":
      engine.stop();
      return Response.json({ ok: true, status: engine.getStatus() });
    case "report":
      return Response.json(await engine.emitDailyReport());
    case "tick":
    default: {
      const run = await engine.tick();
      return Response.json({
        ok: true,
        runId: run.id,
        decisions: run.decisions.filter((d) => d.approved).length,
        insights: run.insights.length,
        status: engine.getStatus(),
      });
    }
  }
}
