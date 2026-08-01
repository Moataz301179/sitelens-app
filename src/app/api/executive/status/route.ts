import { engine } from "@/lib/executive-team/autonomy/engine";
import { setRuntimeLLM } from "@/lib/executive-team/shared/runtime-key";

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
  let creds: { provider?: string; model?: string; apiKey?: string } = {};
  try {
    const body = await req.json();
    action = body?.action ?? "tick";
    creds = body ?? {};
  } catch { /* default tick */ }

  // Use the browser-entered key so the crew runs with the user's key (zero server config).
  if (creds.apiKey) {
    setRuntimeLLM({ provider: creds.provider ?? "", model: creds.model ?? "", apiKey: creds.apiKey });
  }

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
