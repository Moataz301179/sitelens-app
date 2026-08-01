"use client";

import { CircleAlert, CheckCircle2, Eye, EyeOff, ExternalLink, Loader2, Plug, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { loadKeys, saveKeys, type KeyStore } from "@/lib/keys";
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/types";
import { Button, Modal, toast } from "./ui";
import ModelPicker from "./ModelPicker";

type TestState = "idle" | "testing" | "connected" | "error";
interface TestStatus {
  state: TestState;
  msg?: string;
}

export default function KeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<KeyStore>({ openrouter: "", model: {} });
  const [reveal, setReveal] = useState(false);
  const [test, setTest] = useState<TestStatus>({ state: "idle" });

  useEffect(() => {
    if (open) {
      setKeys(loadKeys());
      setTest({ state: "idle" });
    }
  }, [open]);

  const curModel = keys.model?.openrouter ?? "";
  const apiKey = keys.openrouter;

  const setModel = (m: string) => setKeys((k) => ({ ...k, model: { ...k.model, openrouter: m } }));

  const testConnection = async () => {
    if (!apiKey) {
      setTest({ state: "error", msg: "Enter an API key first." });
      return;
    }
    setTest({ state: "testing" });
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", model: curModel.trim() || DEFAULT_OPENROUTER_MODEL, apiKey }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        setTest({ state: "connected", msg: "Connected to OpenRouter" });
      } else {
        setTest({ state: "error", msg: data?.error || "Connection failed." });
      }
    } catch (e) {
      setTest({ state: "error", msg: e instanceof Error ? e.message : "Connection failed." });
    }
  };

  const save = () => {
    saveKeys(keys);
    toast("OpenRouter key saved in this browser", "ok");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="OpenRouter key" width="max-w-xl">
      <p className="mb-4 text-[13px] leading-relaxed text-mut">
        Keys are stored <span className="font-semibold text-ink">only in this browser</span> (localStorage) and sent directly with each audit/chat request — never written to the SiteLens database. With a key, the semantic agent layer (competitors, idea validation, novelty, AI findings) activates on top of the measured heuristic scan.
      </p>

      {/* API key field */}
      <label className="font-data mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-faint">OpenRouter API key</label>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setKeys((k) => ({ ...k, openrouter: e.target.value.trim() }))}
          placeholder="sk-or-v1-…"
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

      {/* Model — live list of FREE OpenRouter models (no embedded presets) */}
      <label className="font-data mb-1.5 mt-4 block text-[11px] uppercase tracking-[0.12em] text-faint">Model</label>
      <ModelPicker value={curModel} onChange={setModel} placeholder={DEFAULT_OPENROUTER_MODEL} />
      <p className="mt-1.5 text-[11.5px] text-faint">
        All <span className="font-semibold text-ok">free</span> OpenRouter models are loaded live — pick one or type any model id.
      </p>

      {/* Connection test */}
      <div className="mt-4 flex items-center gap-3">
        <Button kind="outline" onClick={testConnection} disabled={test.state === "testing"} className="!px-3 !py-2">
          {test.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Test connection
        </Button>
        {test.state === "connected" && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ok">
            <CheckCircle2 className="h-4 w-4" /> Connected
          </span>
        )}
        {test.state === "error" && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-bad">
            <CircleAlert className="h-4 w-4" /> {test.msg}
          </span>
        )}
      </div>

      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-acc hover:underline"
      >
        Get an OpenRouter key <ExternalLink className="h-3 w-3" />
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
