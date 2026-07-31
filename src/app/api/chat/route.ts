import { getAnalysis, getOrCreateChatSession, saveChatMessages } from "@/lib/db-helpers";
import { complete, type ChatMsg } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = (brief: string) => `You are the SiteLens audit copilot — a sharp, practical consultant embedded in a website audit report.
You answer ONLY about the audited site and its findings. Be concrete: cite scores/findings, give prioritized fixes, and offer ready-to-paste prompts when asked.
Never invent metrics not in the brief; if asked about something not measured, say so and suggest how to check.
Keep answers under 220 words unless the user asks for depth. Use short paragraphs and bullet lists.

AUDIT BRIEF:
${brief}`;

export async function POST(req: Request) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const limit = await checkRateLimit(ip, "chat");
  if (!limit.allowed) {
    return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  let body: { analysisId?: string; provider?: string; model?: string; apiKey?: string; message?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { analysisId, provider, model, apiKey, message } = body;
  if (!analysisId || !provider || !model || !apiKey || !message?.trim()) {
    return Response.json({ error: "analysisId, provider, model, apiKey and message are required." }, { status: 400 });
  }

  const analysis = await getAnalysis(analysisId);
  if (!analysis?.report) return Response.json({ error: "Analysis not found or not finished." }, { status: 404 });

  const r = analysis.report;
  const topFindings = r.agents
    .flatMap((a) => a.findings)
    .filter((f) => f.severity === "critical" || f.severity === "warning")
    .slice(0, 12)
    .map((f) => `- [${f.severity}] ${f.title} (${f.agent}): ${f.detail} → ${f.fix}`)
    .join("\n");
  const brief = [
    `Site: ${r.domain} (${r.finalUrl}) — category: ${r.category}`,
    `Scores: overall ${r.scores.overall} — SEO ${r.scores.seo}, A11y ${r.scores.accessibility}, Security ${r.scores.security}, Perf ${r.scores.performance}, BP ${r.scores.bestPractices}, UX ${r.scores.ux}`,
    `Stack: ${r.tech.join(", ") || "unknown"} | TTFB ${r.fetchMs}ms | ${r.sizeKb}KB | ${r.https ? "HTTPS" : "HTTP"}`,
    r.lighthouse ? `Lighthouse: Perf ${r.lighthouse.performance}, A11y ${r.lighthouse.accessibility}, SEO ${r.lighthouse.seo}, BP ${r.lighthouse.bestPractices}` : "",
    r.security ? `Security score: ${r.security.score}/100 | SSL: ${r.security.ssl?.valid ? "valid" : "N/A"} | CVEs: ${r.security.vulnerabilities?.length ?? 0}` : "",
    `Novelty: ${r.novelty.score}/100 — ${r.novelty.verdict}`,
    `Competitors: ${r.competitors.map((c) => `${c.name} (${c.threat})`).join(", ") || "not identified"}`,
    `TOP FINDINGS:\n${topFindings || "- none"}`,
  ].filter(Boolean).join("\n");

  try {
    const session = await getOrCreateChatSession(analysisId, provider, model);
    const history = session.messages ?? [];
    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM(brief) },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];
    const reply = await complete({ provider, model, apiKey, messages, maxTokens: 700, temperature: 0.5 });
    const next = [...history, { role: "user" as const, content: message.trim() }, { role: "assistant" as const, content: reply }].slice(-24);
    await saveChatMessages(session.id, next as { role: "user" | "assistant"; content: string }[]);
    return Response.json({ sessionId: session.id, reply, history: next });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Chat failed." }, { status: 502 });
  }
}
