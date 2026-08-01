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

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const PROVIDER_FN: Record<string, (opts: CompletionOpts) => Promise<string>> = {
  openrouter: openAiLike(OPENROUTER_ENDPOINT, {
    Authorization: "", // filled per call
    "HTTP-Referer": "https://sitelens.app",
    "X-Title": "SiteLens",
  }),
};

export async function complete(opts: CompletionOpts): Promise<string> {
  if (!opts.apiKey) throw new Error("No API key provided for " + opts.provider);
  if (opts.provider !== "openrouter") throw new Error(`Unsupported provider "${opts.provider}". Only OpenRouter is supported.`);
  // openAiLike carries an empty Authorization; inject the bearer token per call.
  return openAiLike(OPENROUTER_ENDPOINT, {
    Authorization: `Bearer ${opts.apiKey}`,
    "HTTP-Referer": "https://sitelens.app",
    "X-Title": "SiteLens",
  })(opts);
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
