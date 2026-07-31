"use client";

import { CircleAlert, CheckCircle2, Eye, EyeOff, ExternalLink, Loader2, Plug, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { loadKeys, saveKeys, type KeyStore } from "@/lib/keys";
import { PROVIDERS } from "@/lib/types";
import { Button, Modal, toast } from "./ui";

type TestState = "idle" | "testing" | "connected" | "error";
interface TestStatus {
  state: TestState;
  msg?: string;
}

export default function KeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<KeyStore>({ openrouter: "", gemini: "", zai: "", opencode: "", model: {} });
  const [active, setActive] = useState("openrouter");
  const [reveal, setReveal] = useState(false);
  const [tests, setTests] = useState<Record<string, TestStatus>>({});

  useEffect(() => {
    if (open) setKeys(loadKeys());
  }, [open]);

  const def = PROVIDERS.find((p) => p.id === active)!;
  const curModel = keys.model?.[active] ?? def.models[0];
  const apiKey = keys[active as keyof KeyStore] as string;
  const test = tests[active];

  const setModel = (m: string) => setKeys((k) => ({ ...k, model: { ...k.model, [active]: m } }));

  const testConnection = async () => {
    if (!apiKey) {
      setTests((t) => ({ ...t, [active]: { state: "error", msg: "Enter an API key first." } }));
      return;
    }
    setTests((t) => ({ ...t, [active]: { state: "testing" } }));
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: active, model: curModel, apiKey }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setTests((t) => ({ ...t, [active]: { state: "connected", msg: `Connected to ${def.label}` } }));
      } else {
        setTests((t) => ({ ...t, [active]: { state: "error", msg: data?.error || "Connection failed." } }));
      }
    } catch (e) {
      setTests((t) => ({ ...t, [active]: { state: "error", msg: e instanceof Error ? e.message : "Connection failed." } }));
    }
  };

  const save = () => {
    saveKeys(keys);
    toast("Provider keys saved in this browser", "ok");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="AI provider keys" width="max-w-xl">
      <p className="mb-4 text-[13px] leading-relaxed text-mut">
        Keys are stored <span className="font-semibold text-ink">only in this browser</span> (localStorage) and sent directly with each audit/chat request — never written to the SiteLens database. With a key, the semantic agent layer (competitors, idea validation, novelty, AI findings) activates on top of the measured heuristic scan.
      </p>

      {/* Provider list (scroll-down) */}
      <label className="font-data mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-faint">Provider</label>
      <select
        value={active}
        onChange={(e) => setActive(e.target.value)}
        className="mb-4 w-full rounded-md border border-line2 bg-bg px-3 py-2.5 text-[13px] font-semibold text-ink focus:border-acc/60 focus:outline-none"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {keys[p.id as keyof KeyStore] ? " • key set" : ""}
            {tests[p.id]?.state === "connected" ? " • connected" : ""}
          </option>
        ))}
      </select>

      {/* Quick provider tabs */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`relative rounded-md border px-2 py-2 text-[12px] font-bold transition-colors ${
              active === p.id ? "border-acc/60 bg-acc/10 text-acc" : "border-line bg-panel2 text-mut hover:text-ink"
            }`}
          >
            {p.label}
            <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${keys[p.id as keyof KeyStore] ? "bg-ok" : "bg-line2"}`} />
            {tests[p.id]?.state === "connected" && <CheckCircle2 className="absolute right-1.5 top-1.5 h-3 w-3 text-ok" />}
          </button>
        ))}
      </div>

      {/* API key field */}
      <label className="font-data mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-faint">{def.label} API key</label>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setKeys((k) => ({ ...k, [active]: e.target.value.trim() }))}
          placeholder={def.keyHint}
          className="w-full rounded-md border border-line2 bg-bg px-3 py-2.5 pr-10 font-data text-[13px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none"
          autoComplete="off"
        />
        <button
          onClick={() => setReveal((r) => !r)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
          aria-label="Toggle key visibility"
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Model name field */}
      <label className="font-data mb-1.5 mt-4 block text-[11px] uppercase tracking-[0.12em] text-faint">Model</label>
      <select
        value={curModel}
        onChange={(e) => setModel(e.target.value)}
        className="w-full rounded-md border border-line2 bg-bg px-3 py-2.5 text-[13px] font-semibold text-ink focus:border-acc/60 focus:outline-none"
      >
        {def.models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* Connection test */}
      <div className="mt-4 flex items-center gap-3">
        <Button kind="outline" onClick={testConnection} disabled={test?.state === "testing"} className="!px-3 !py-2">
          {test?.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Test connection
        </Button>
        {test?.state === "connected" && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ok">
            <CheckCircle2 className="h-4 w-4" /> Connected
          </span>
        )}
        {test?.state === "error" && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-bad">
            <CircleAlert className="h-4 w-4" /> {test.msg}
          </span>
        )}
      </div>

      <a
        href={def.docsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-acc hover:underline"
      >
        Get a {def.label} key <ExternalLink className="h-3 w-3" />
      </a>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[11.5px] text-faint">Audits also run keyless — on the measured heuristic engine.</span>
        <Button onClick={save}>
          <Save className="h-4 w-4" /> Save keys
        </Button>
      </div>
    </Modal>
  );
}
