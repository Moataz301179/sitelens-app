import { complete } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/providers/test — validate that a provider key + model actually work.
 * Proxies a minimal completion call server-side (avoids browser CORS and keeps
 * the key server-side for the check). Returns { ok: true } or { ok: false, error }.
 */
export async function POST(req: Request) {
  let body: { provider?: string; model?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const provider = (body.provider ?? "").trim();
  const model = (body.model ?? "").trim();
  const apiKey = (body.apiKey ?? "").trim();

  if (!provider) return Response.json({ ok: false, error: "Missing provider." }, { status: 400 });
  if (!apiKey) return Response.json({ ok: false, error: "Enter an API key first." }, { status: 400 });

  try {
    const reply = await complete({
      provider,
      model: model || undefined!,
      apiKey,
      maxTokens: 8,
      temperature: 0,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    if (!reply || reply.trim().length === 0) {
      return Response.json({ ok: false, error: "Provider returned an empty response — check the model name." });
    }
    return Response.json({ ok: true, provider, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed.";
    return Response.json({ ok: false, error: message });
  }
}
