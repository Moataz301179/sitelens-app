export interface KeyStore {
  openrouter: string;
  gemini: string;
  zai: string;
  opencode: string;
  /** Selected model per provider (persisted so the test + scans use it). */
  model: Record<string, string>;
}

const LS_KEY = "sitelens.keys.v1";

const EMPTY: KeyStore = { openrouter: "", gemini: "", zai: "", opencode: "", model: {} };

export function loadKeys(): KeyStore {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<KeyStore>) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveKeys(k: KeyStore): void {
  localStorage.setItem(LS_KEY, JSON.stringify(k));
  window.dispatchEvent(new Event("sitelens-keys-changed"));
}

export function firstAvailableProvider(k: KeyStore): string | null {
  if (k.openrouter) return "openrouter";
  if (k.gemini) return "gemini";
  if (k.zai) return "zai";
  if (k.opencode) return "opencode";
  return null;
}
