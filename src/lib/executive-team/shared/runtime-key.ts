/**
 * Runtime LLM credentials for the executive crew.
 *
 * The Executive Dashboard sends the browser-entered provider key (the same one
 * that powers audits) on every exec request, so the crew uses the user's key
 * with ZERO server config. base-agent.ts reads these and only falls back to
 * process.env.OPENROUTER_API_KEY when no runtime key has been set.
 */
export interface RuntimeLLM {
  provider: string;
  model: string;
  apiKey: string;
}

let current: RuntimeLLM = { provider: "", model: "", apiKey: "" };

export function setRuntimeLLM(creds: Partial<RuntimeLLM>): void {
  if (creds.apiKey !== undefined) current.apiKey = creds.apiKey.trim();
  if (creds.provider !== undefined) current.provider = creds.provider.trim();
  if (creds.model !== undefined) current.model = creds.model.trim();
}

export function getRuntimeLLM(): RuntimeLLM {
  return { ...current };
}
