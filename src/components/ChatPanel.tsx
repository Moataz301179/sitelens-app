"use client";

import { ArrowUp, Bot, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EMPTY_KEYS, firstAvailableProvider, loadKeys, type KeyStore } from "@/lib/keys";
import { PROVIDERS } from "@/lib/types";
import { Button, Spinner, toast } from "./ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I fix first?",
  "Write a prompt to fix the security issues",
  "How do I beat the competitors listed?",
  "Is this site ready for launch?",
  "Summarize the UX problems for my designer",
];

export default function ChatPanel({ analysisId, domain, open, onClose }: { analysisId: string; domain: string; open: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<KeyStore>(EMPTY_KEYS);
  const [provider, setProvider] = useState<string>("openrouter");
  const [model, setModel] = useState<string>(PROVIDERS[0].models[0]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load keys only on the client (after mount) to avoid SSR/client hydration mismatches.
  useEffect(() => {
    const k = loadKeys();
    setKeys(k);
    const first = firstAvailableProvider(k) ?? "openrouter";
    setProvider(first);
    setModel(PROVIDERS.find((p) => p.id === first)?.models[0] ?? PROVIDERS[0].models[0]);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  const pDef = PROVIDERS.find((p) => p.id === provider)!;
  const hasKey = !!keys[provider as keyof typeof keys];

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    if (!hasKey) {
      setErr(`No ${pDef.label} key saved. Add one via "AI provider keys".`);
      return;
    }
    setInput("");
    setErr(null);
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, provider, model, apiKey: keys[provider as keyof typeof keys], message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat request failed.");
      setMsgs(data.history as Msg[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chat request failed.");
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-line bg-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-acc/15 text-acc">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <div className="font-display text-[14px] font-bold leading-tight">Audit copilot</div>
            <div className="font-data text-[10.5px] uppercase tracking-wide text-faint">{domain}</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1.5 text-mut hover:bg-panel2 hover:text-ink" aria-label="Close chat">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2.5">
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setModel(PROVIDERS.find((p) => p.id === e.target.value)!.models[0]);
          }}
          className="rounded-md border border-line2 bg-bg px-2 py-1.5 text-[12px] font-semibold text-ink focus:border-acc/60 focus:outline-none"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} {keys[p.id as keyof typeof keys] ? "•" : "(no key)"}
            </option>
          ))}
        </select>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border border-line2 bg-bg px-2 py-1.5 font-data text-[11.5px] text-ink focus:border-acc/60 focus:outline-none"
        >
          {pDef.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && !busy && (
          <div className="animate-fade-up">
            <div className="rounded-lg border border-line bg-panel2 p-3.5 text-[13px] leading-relaxed text-mut">
              I have the full audit of <span className="font-semibold text-ink">{domain}</span> in context — scores, findings, competitors, prompts. Ask me anything about it.
            </div>
            <div className="mt-3 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-md border border-line bg-panel2 px-3 py-2 text-left text-[12.5px] font-semibold text-mut transition-colors hover:border-acc/40 hover:text-acc"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`animate-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user" ? "bg-acc text-acctext font-semibold" : "border border-line bg-panel2 text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-mut">
            <Spinner className="h-3.5 w-3.5 text-acc" /> reasoning with {pDef.label}…
          </div>
        )}
        {err && <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12.5px] font-semibold text-bad">{err}</div>}
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={hasKey ? "Ask about the audit…" : `Add a ${pDef.label} key to chat`}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-md border border-line2 bg-bg px-3 py-2.5 text-[13px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none"
          />
          <Button onClick={() => send()} disabled={busy || !input.trim()} className="h-[42px] w-[42px] !px-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        {!hasKey && (
          <button onClick={() => toast("Open the 'AI provider keys' dialog from the top bar", "mut")} className="mt-1.5 text-[11.5px] font-semibold text-warn hover:underline">
            <MessageSquare className="mr-1 inline h-3 w-3" /> No key for {pDef.label} — the audit copilot needs one
          </button>
        )}
      </div>
    </aside>
  );
}
