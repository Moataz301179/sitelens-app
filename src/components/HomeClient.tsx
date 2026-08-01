"use client";

import { ArrowRight, ExternalLink, Globe, KeyRound, Radar, Settings2, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/agentMeta";
import { EMPTY_KEYS, firstAvailableProvider, loadKeys, saveKeys } from "@/lib/keys";
import { PROVIDERS, type AgentId, type AuditEvent } from "@/lib/types";
import KeysModal from "./KeysModal";
import ApplyFixesButton from "./ApplyFixesButton";
import ExecutiveDashboard from "./ExecutiveDashboard";
import { Brand, Button, Chip, ClientTime, KeyPill, Panel, Spinner, Toaster, toast } from "./ui";

interface RecentRow {
  id: string;
  url: string;
  domain: string;
  status: string;
  overallScore: number | null;
  provider: string | null;
  createdAt: string;
}

type AgentStatus = "pending" | "running" | "done";

export default function HomeClient({ initialRecent }: { initialRecent: RecentRow[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [keys, setKeys] = useState(EMPTY_KEYS);
  const [provider, setProvider] = useState<string>("heuristic");
  const [model, setModel] = useState<string>("");
  const [keysOpen, setKeysOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentRow[]>(initialRecent);
  const analysisIdRef = useRef<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    const onKeys = () => {
      const k = loadKeys();
      setKeys(k);
      const first = firstAvailableProvider(k);
      setProvider((prev) => (prev === "heuristic" && first ? first : prev));
    };
    window.addEventListener("sitelens-keys-changed", onKeys);
    onKeys();
    return () => window.removeEventListener("sitelens-keys-changed", onKeys);
  }, []);

  useEffect(() => {
    const def = PROVIDERS.find((p) => p.id === provider);
    // Preserve any saved model (including custom ids outside the preset list);
    // only default to the first preset when nothing has been chosen for this provider yet.
    setModel(keys.model?.[provider] || def?.models[0] || "");
  }, [provider, keys.model]);

  const refreshRecent = async () => {
    try {
      const res = await fetch("/api/analyses");
      if (res.ok) setRecent(await res.json());
    } catch {
      /* noop */
    }
  };

  // Persist the chosen model per provider so custom ids survive reloads and
  // switching providers never leaks one provider's model into another.
  const changeModel = (m: string) => {
    setModel(m);
    saveKeys({ ...keys, model: { ...keys.model, [provider]: m } });
  };

  const startScan = async () => {
    const target = url.trim();
    if (!target) {
      toast("Enter a URL first", "bad");
      return;
    }
    const useAi = provider !== "heuristic";
    const apiKey = useAi ? keys[provider as keyof typeof keys] : "";
    if (useAi && !apiKey) {
      setKeysOpen(true);
      toast(`No ${PROVIDERS.find((p) => p.id === provider)?.label} key saved yet`, "bad");
      return;
    }

    setScanning(true);
    setScanError(null);
    setProgressMsg(null);
    setAgentStatus(Object.fromEntries(AGENTS.map((a) => [a.id, "pending"])));

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, provider: useAi ? provider : undefined, model: useAi ? model : undefined, apiKey: useAi ? apiKey : undefined }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Scan request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let doneId: string | null = null;
      let failedMsg: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6)) as AuditEvent;
          if (evt.type === "started" && evt.analysisId) analysisIdRef.current = evt.analysisId;
          if (evt.type === "agent" && evt.agent) {
            setAgentStatus((s) => ({ ...s, [evt.agent as AgentId]: (evt.status as AgentStatus) ?? "done" }));
          }
          if (evt.type === "progress" && evt.message) setProgressMsg(evt.message);
          if (evt.type === "error" && evt.message) failedMsg = evt.message;
          if (evt.type === "done" && evt.analysisId) doneId = evt.analysisId;
        }
      }

      if (failedMsg && !doneId) {
        setScanError(failedMsg);
        setScanning(false);
        setAgentStatus({});
        return;
      }
      await refreshRecent();
      if (doneId) router.push(`/report/${doneId}`);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed.");
      setScanning(false);
      setAgentStatus({});
    }
  };

  const activeProvider = PROVIDERS.find((p) => p.id === provider);
  const doneCount = Object.values(agentStatus).filter((s) => s === "done").length;

  return (
    <div className="min-h-screen">
      <Toaster />
      <KeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="/" className="transition-opacity hover:opacity-85">
            <Brand />
          </a>
          <div className="flex items-center gap-2.5">
            <span className="font-data hidden text-[11px] uppercase tracking-[0.12em] text-faint sm:block">multi-agent site audit</span>
            <KeyPill hasKey={!!firstAvailableProvider(keys)} onClick={() => setKeysOpen(true)} />
          </div>
        </div>
      </header>

      <main className="grid-paper">
        <div className="mx-auto max-w-6xl px-5 pb-16">
          {/* console */}
          <section className="pt-10 sm:pt-14">
            <div className="max-w-2xl">
              <div className="font-data flex items-center gap-2 text-[11.5px] uppercase tracking-[0.16em] text-acc">
                <Radar className="h-3.5 w-3.5" /> Pre-publish intelligence
              </div>
              <h1 className="font-display mt-3 text-3xl font-bold leading-[1.12] tracking-tight sm:text-[40px]">
                Point ten expert agents at any URL.
                <br />
                Get the verdict before your users do.
              </h1>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-mut">
                SiteLens measures the real site — response, weight, headers, markup — then runs market, idea-validation, business-logic, UX, compliance, security and QA agents over it. You leave with scores, corrective prompts for your AI builder, redesign concepts and the exact open-source tools to fix each weakness.
              </p>
            </div>

            <Panel className="mt-8 max-w-3xl p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !scanning && startScan()}
                    placeholder="anywebsite.com"
                    disabled={scanning}
                    className="w-full rounded-md border border-line2 bg-bg py-3 pl-10 pr-3 font-data text-[14px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none disabled:opacity-60"
                    autoFocus
                  />
                </div>
                <Button onClick={startScan} disabled={scanning} className="!px-6 !py-3">
                  {scanning ? (
                    <>
                      <Spinner /> Auditing…
                    </>
                  ) : (
                    <>
                      Run audit <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <span className="font-data text-[10.5px] uppercase tracking-[0.12em] text-faint">Agent brain:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setProvider("heuristic")}
                    className={`rounded-md border px-2.5 py-1 text-[12px] font-bold transition-colors ${
                      provider === "heuristic" ? "border-acc/60 bg-acc/10 text-acc" : "border-line2 bg-panel2 text-mut hover:text-ink"
                    }`}
                  >
                    Measured heuristics (no key)
                  </button>
                  {PROVIDERS.map((p) => {
                    const has = !!keys[p.id as keyof typeof keys];
                    const active = provider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => (has ? setProvider(p.id) : setKeysOpen(true))}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-bold transition-colors ${
                          active ? "border-acc/60 bg-acc/10 text-acc" : has ? "border-line2 bg-panel2 text-mut hover:text-ink" : "border-line bg-panel2 text-faint hover:text-mut"
                        }`}
                      >
                        {p.label}
                        <span className={`h-1.5 w-1.5 rounded-full ${has ? "bg-ok" : "bg-line2"}`} />
                        {!has && <KeyRound className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
                {activeProvider && provider !== "heuristic" && (
                  <>
                    <input
                      list={`model-suggestions-${provider}`}
                      value={model}
                      onChange={(e) => changeModel(e.target.value)}
                      placeholder={activeProvider.models[0]}
                      title="Model id — presets are suggestions, type any model"
                      className="w-52 rounded-md border border-line2 bg-bg px-2 py-1 font-data text-[11.5px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <datalist id={`model-suggestions-${provider}`}>
                      {activeProvider.models.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              {scanError && (
                <div className="animate-fade-up mt-3.5 rounded-md border border-bad/40 bg-bad/10 px-3.5 py-2.5 text-[13px] font-semibold text-bad">
                  {scanError}
                </div>
              )}
            </Panel>

            {/* live pipeline */}
            {scanning && (
              <Panel className="animate-fade-up relative mt-4 max-w-3xl overflow-hidden p-5">
                <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
                  <div className="animate-scanline h-full w-1/3 bg-acc" />
                </div>
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="font-data text-[11px] uppercase tracking-[0.14em] text-acc">Agent pipeline</span>
                  <span className="font-data text-[11.5px] text-mut">
                    {doneCount}/{AGENTS.length} agents
                  </span>
                </div>
                {progressMsg && <div className="mb-3 text-[12.5px] font-semibold text-warn">{progressMsg}</div>}
                <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {AGENTS.map((a) => {
                    const st = (agentStatus[a.id] ?? "pending") as AgentStatus;
                    return (
                      <div key={a.id} className={`flex items-center gap-2.5 rounded px-2 py-1.5 transition-colors ${st === "running" ? "bg-panel2" : ""}`}>
                        {st === "done" ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok/15 text-ok">
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        ) : st === "running" ? (
                          <Spinner className="h-4 w-4 text-acc" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-line2" />
                        )}
                        <span className={`text-[13px] font-bold ${st === "pending" ? "text-faint" : "text-ink"}`}>{a.name}</span>
                        <span className="hidden truncate text-[11.5px] text-faint lg:block">{a.tagline}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </section>

          {/* what you get — compact ledger, not cards */}
          <section className="mt-14 grid max-w-4xl gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
            {[
              { icon: <Zap className="h-4 w-4" />, t: "Scored in seconds", d: "Six weighted scores — SEO, accessibility, security, performance, best practices, UX — from a real fetch, not screenshots." },
              { icon: <ShieldCheck className="h-4 w-4" />, t: "Launch-gate toolkit", d: "Violations, bug candidates, header gaps and placeholder-copy leaks, each with severity and a one-click corrective prompt." },
              { icon: <Settings2 className="h-4 w-4" />, t: "Fix routing", d: "GitHub tool finder maps every weakness to the most-starred open-source fix, plus three redesign concepts you can preview." },
            ].map((x) => (
              <div key={x.t} className="bg-panel p-5">
                <div className="flex items-center gap-2 text-acc">{x.icon}<span className="font-display text-[14px] font-bold text-ink">{x.t}</span></div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-mut">{x.d}</p>
              </div>
            ))}
          </section>

          {/* autonomous executive team */}
          <section className="mt-14">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold tracking-tight">Autonomous executive team</h2>
              <p className="mt-1 text-[12.5px] text-mut">
                A self-running crew of AI executives — CEO, CFO, CTO, COO, CMO, CRO, CIO + the SWE engineer — analyzes
                every audit, makes decisions, executes and measures the real effect. See the team and its live output below.
              </p>
            </div>
            <ExecutiveDashboard />
            <div className="mt-6">
              <ApplyFixesButton defaultUrl={url} />
            </div>
          </section>

          <section className="mt-14">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">Recent audits</h2>
              <button onClick={refreshRecent} className="text-[12px] font-bold text-mut hover:text-acc">
                Refresh
              </button>
            </div>
            {recent.length === 0 ? (
              <Panel className="p-8 text-center">
                <div className="font-data text-[11px] uppercase tracking-[0.14em] text-faint">No audits yet</div>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mut">Run your first scan above — reports are stored here so you can re-audit after each fix and watch the score move.</p>
              </Panel>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-panel2 font-data text-[10.5px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Domain</th>
                      <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Score</th>
                      <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Engine</th>
                      <th className="hidden px-4 py-2.5 font-semibold md:table-cell">When</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-line bg-panel last:border-0 hover:bg-panel2">
                        <td className="px-4 py-3">
                          <div className="font-bold text-ink">{r.domain}</div>
                          <div className="font-data text-[10.5px] text-faint">{r.status === "failed" ? "failed" : r.status}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.overallScore != null ? (
                            <span className={`font-data text-[14px] font-bold ${r.overallScore >= 80 ? "text-ok" : r.overallScore >= 60 ? "text-acc" : r.overallScore >= 40 ? "text-warn" : "text-bad"}`}>
                              {r.overallScore}
                            </span>
                          ) : (
                            <span className="font-data text-[12px] text-faint">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <Chip tone={r.provider ? "acc" : "mut"}>{r.provider ?? "heuristics"}</Chip>
                        </td>
                        <td className="font-data hidden px-4 py-3 text-[11.5px] text-mut md:table-cell">
                          <ClientTime date={r.createdAt} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "failed" ? (
                            <span className="font-data text-[11px] text-bad">view error</span>
                          ) : (
                            <a href={`/report/${r.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-acc hover:underline">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[11.5px] text-faint">
            <span>SiteLens — audits run on a live fetch of your target; keys never leave your browser except to the provider you pick.</span>
            <span className="font-data uppercase tracking-[0.12em]">heuristic engine + optional LLM layer</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
