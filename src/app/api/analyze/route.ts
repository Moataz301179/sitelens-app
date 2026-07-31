import { runAudit } from "@/lib/agents";
import { checkRateLimit } from "@/lib/rateLimit";
import type { ProviderCreds, AuditEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Rate limit: 10 requests per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "anonymous";
  const limit = await checkRateLimit(ip, "analyze");
  if (!limit.allowed) {
    return Response.json(
      { error: `Rate limit exceeded. ${limit.remaining} remaining. Resets in ${Math.round((limit.reset - Date.now()) / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.reset - Date.now()) / 1000)) } },
    );
  }

  let body: { url?: string; provider?: string; model?: string; apiKey?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!url || url.length < 4 || !/\./.test(url)) {
    return Response.json({ error: "Enter a valid URL, e.g. example.com" }, { status: 400 });
  }

  const creds: ProviderCreds | null =
    body.provider && body.model && body.apiKey
      ? { provider: body.provider, model: body.model, apiKey: body.apiKey }
      : null;

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (evt: AuditEvent) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`)); } catch { /* client gone */ }
      };
      try {
        for await (const evt of runAudit(url, creds)) send(evt);
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Audit crashed." });
      } finally {
        try { controller.close(); } catch { /* noop */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(limit.remaining),
      "X-RateLimit-Reset": String(limit.reset),
    },
  });
}
