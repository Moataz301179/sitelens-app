export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOpts {
  provider: string;
  model: string;
  apiKey: string;
  messages: ChatMsg[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

interface OpenAiLikeBody {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

function openAiLike(endpoint: string, headers: Record<string, string>) {
  return async (opts: CompletionOpts): Promise<string> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.4,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const body = (await res.json().catch(() => null)) as OpenAiLikeBody | null;
    if (!res.ok) {
      throw new Error(body?.error?.message || `Provider returned ${res.status} — check the API key and model name.`);
    }
    return body?.choices?.[0]?.message?.content ?? "";
  };
}

async function gemini(opts: CompletionOpts): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 1200,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  } | null;
  if (!res.ok) {
    throw new Error(body?.error?.message || `Gemini returned ${res.status} — check the API key and model name.`);
  }
  return body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

const PROVIDER_FN: Record<string, (opts: CompletionOpts) => Promise<string>> = {
  openrouter: openAiLike("https://openrouter.ai/api/v1/chat/completions", {
    Authorization: "", // filled per call
    "HTTP-Referer": "https://sitelens.app",
    "X-Title": "SiteLens",
  }),
  zai: openAiLike("https://api.z.ai/api/paas/v4/chat/completions", { Authorization: "" }),
  opencode: openAiLike("https://opencode.ai/zen/v1/chat/completions", { Authorization: "" }),
  gemini,
};

export async function complete(opts: CompletionOpts): Promise<string> {
  if (!opts.apiKey) throw new Error("No API key provided for " + opts.provider);
  const fn = PROVIDER_FN[opts.provider];
  if (!fn) throw new Error(`Unknown provider "${opts.provider}". Supported: OpenRouter, Gemini, Z.ai, OpenCode.`);
  // openAiLike closures carry an empty Authorization; wrap to inject the bearer token.
  if (opts.provider === "openrouter" || opts.provider === "zai" || opts.provider === "opencode") {
    const endpoint =
      opts.provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : opts.provider === "zai"
          ? "https://api.z.ai/api/paas/v4/chat/completions"
          : "https://opencode.ai/zen/v1/chat/completions";
    return openAiLike(endpoint, {
      Authorization: `Bearer ${opts.apiKey}`,
      ...(opts.provider === "openrouter" ? { "HTTP-Referer": "https://sitelens.app", "X-Title": "SiteLens" } : {}),
    })(opts);
  }
  return fn(opts);
}

export function extractJson(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 8) return "•".repeat(k.length);
  return k.slice(0, 4) + "•".repeat(Math.min(8, k.length - 8)) + k.slice(-4);
}
