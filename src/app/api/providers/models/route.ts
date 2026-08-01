import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrModel {
  id: string;
  name?: string;
  description?: string | null;
  context_length?: number | null;
  pricing?: { prompt?: string; completion?: string; request?: string; image?: string };
  architecture?: { modality?: string; output_modalities?: string[]; input_modalities?: string[] };
}

interface ModelEntry {
  id: string;
  name: string;
  context: number | null;
  description: string;
}

const TTL = 1000 * 60 * 60; // 1 hour
let cache: { at: number; data: { models: ModelEntry[]; updatedAt: string; offline?: boolean } } | null = null;

const OFFLINE_FALLBACK: ModelEntry[] = [
  { id: "openrouter/free", name: "Free Models Router", context: 200000, description: "Routes each request to a free model automatically." },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI gpt-oss-20b (free)", context: 131072, description: "" },
  { id: "google/gemma-4-31b-it:free", name: "Google Gemma 4 31B (free)", context: 262144, description: "" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "NVIDIA Nemotron 3 Super (free)", context: 262144, description: "" },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3.2 (free)", context: 163840, description: "" },
];

/**
 * GET /api/providers/models — live list of FREE models from OpenRouter's public
 * API (no key required). Only models with prompt AND completion priced at $0 and
 * text output are returned. Cached for 1h to avoid hammering the endpoint.
 */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json", "User-Agent": "SiteLens" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);

    const data = (await res.json()) as { data?: OrModel[] };
    const free: ModelEntry[] = (data.data ?? [])
      .filter((m) => {
        const p = m.pricing ?? {};
        const isFree = String(p.prompt ?? "") === "0" && String(p.completion ?? "") === "0";
        const out = m.architecture?.output_modalities ?? [];
        const isText = out.length === 0 || out.includes("text");
        return isFree && isText;
      })
      .map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        context: m.context_length ?? null,
        description: (m.description ?? "").slice(0, 160),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const out = { models: free, updatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data: out };
    return NextResponse.json(out, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ models: OFFLINE_FALLBACK, updatedAt: new Date().toISOString(), offline: true });
  }
}
