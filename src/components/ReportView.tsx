"use client";

import {
  AlertTriangle, ArrowUpRight, Bot, Bug, CheckCircle2, ChevronRight, ExternalLink,
  FileWarning, LayoutTemplate, MessageSquare, PackageSearch, Play, RefreshCw,
  Search, Send, ShieldAlert, Sparkles, Star, Target, TerminalSquare, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENTS } from "@/lib/agentMeta";
import type { AgentSection, AuditEvent, Finding, Report, Severity } from "@/lib/types";
import ChatPanel from "./ChatPanel";
import ConceptCard from "./ConceptPreview";
import { Brand, Button, Chip, ClientTime, CopyButton, Panel, ScoreDial, SectionTitle, SevBadge, Spinner, Toaster, toast } from "./ui";

interface GhRepo {
  name: string; url: string; description: string; stars: number; language: string | null; topics: string[];
}

const NAV = [
  { id: "overview", label: "Overview" }, { id: "agents", label: "Agents" },
  { id: "findings", label: "Findings" }, { id: "competitors", label: "Competitors" },
  { id: "concepts", label: "Design concepts" }, { id: "prompts", label: "Fix prompts" }, { id: "tools", label: "Tool finder" },
];

function sevRank(s: Severity) { return s === "critical" ? 0 : s === "warning" ? 1 : s === "info" ? 2 : 3; }

function FindingRow({ f, onFindTools }: { f: Finding; onFindTools: (q: string) => void }) {
  const [open, setOpen] = useState(f.severity === "critical");
  return (
    <div className={`rounded-md border ${f.severity === "critical" ? "border-bad/35 bg-bad/[0.04]" : f.severity === "warning" ? "border-warn/25 bg-panel" : "border-line bg-panel"}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <SevBadge sev={f.severity} />
        <span className="flex-1 text-[13.5px] font-bold text-ink">{f.title}</span>
        <span className="font-data hidden text-[10.5px] uppercase tracking-wide text-faint sm:block">{AGENTS.find((a) => a.id === f.agent)?.name}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-faint transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="animate-fade-up border-t border-line px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-mut">{f.detail}</p>
          <div className="mt-3 rounded-md border border-ok/25 bg-ok/[0.05] px-3.5 py-2.5">
            <div className="font-data text-[10px] uppercase tracking-[0.12em] text-ok">Fix</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/90">{f.fix}</p>
          </div>
          {f.prompt && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-data text-[10px] uppercase tracking-[0.12em] text-faint">Corrective prompt — paste into your AI builder</span>
                <CopyButton text={f.prompt} />
              </div>
              <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-bg px-3.5 py-3 font-data text-[11.5px] leading-relaxed text-mut">{f.prompt}</pre>
            </div>
          )}
          {f.ghQuery && (
            <button onClick={() => onFindTools(f.ghQuery!)} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-acc hover:underline">
              <GhIcon className="h-3.5 w-3.5" /> Find tools: "{f.ghQuery}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportView({ id, status, error, report, domain }: { id: string; status: string; error: string | null; report: Report | null; domain: string }) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<GhRepo[] | null>(null);
  const [toolNote, setToolNote] = useState<string | null>(null);
  const [toolBusy, setToolBusy] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const toolsRef = useRef<HTMLDivElement>(null);
  const r = report;
  const allFindings = useMemo(() => (r ? r.agents.flatMap((a) => a.findings) : []), [r]);
  const actionable = useMemo(() => allFindings.filter((f) => f.severity !== "pass").sort((a, b) => sevRank(a.severity) - sevRank(b.severity)), [allFindings]);
  const passes = useMemo(() => allFindings.filter((f) => f.severity === "pass"), [allFindings]);
  const ghQueries = useMemo(() => {
    const qs: string[] = [];
    for (const f of actionable) if (f.ghQuery && !qs.includes(f.ghQuery)) qs.push(f.ghQuery);
    return qs.slice(0, 10);
  }, [actionable]);

  const searchTools = useCallback(async (q: string) => {
    setToolQuery(q); setToolBusy(true); setToolNote(null);
    try {
      const res = await fetch(`/api/github?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setToolResults(data.items ?? []); setToolNote(data.note ?? null);
    } catch { setToolResults([]); setToolNote("GitHub search failed."); }
    finally { setToolBusy(false); }
  }, []);

  useEffect(() => {
    if (ghQueries.length && toolQuery === null) searchTools(ghQueries[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghQueries.length]);

  const onFindTools = (q: string) => { searchTools(q); toolsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const openChat = (seed?: string | null) => {
    setChatSeed(seed ?? null);
    setChatOpen(true);
  };

  const quickAudit = async (targetUrl: string) => {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }), // heuristic scan, no key needed
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Quick audit failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneId: string | null = null;
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
          if (evt.type === "done" && evt.analysisId) doneId = evt.analysisId;
        }
      }
      if (doneId) router.push(`/report/${doneId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Quick audit failed.", "bad");
    }
  };

  const deepDive = (a: AgentSection) => {
    openChat(
      `Deep-dive your "${a.name}" section for ${r?.domain ?? domain}. Walk me through your methodology, explain your ${a.findings.length} finding${a.findings.length === 1 ? "" : "s"}, and tell me the top 3 things to fix and exactly how.`
    );
  };

  // Load previously declined tool repos so they stay hidden across visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sitelens.declinedTools");
      if (raw) setDeclined(new Set(JSON.parse(raw) as string[]));
    } catch { /* noop */ }
  }, []);

  const installSkill = async (repo: GhRepo) => {
    setInstalling(repo.name);
    try {
      const res = await fetch("/api/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repo.url, name: repo.name }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; pluginName?: string; location?: string; skills?: { name: string }[] } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Install failed.");
      setInstalled((s) => new Set(s).add(repo.name));
      const skills = data.skills?.length ? data.skills.map((s) => s.name).join(", ") : "1 skill";
      toast(`Installed ${data.pluginName} (${skills})`, "ok");
      setToolNote(`Installed to ${data.location}. The agent runtime will auto-discover it on the next turn.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Install failed.", "bad");
    } finally {
      setInstalling(null);
    }
  };

  const declineTool = (name: string) => {
    setDeclined((prev) => {
      const next = new Set(prev);
      next.add(name);
      try { localStorage.setItem("sitelens.declinedTools", JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
    toast(`Declined ${name} — hidden from this report`, "mut");
  };

  if (!r || status === "failed") {
    return (
      <div className="min-h-screen"><Toaster /><header className="border-b border-line bg-bg/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3"><Link href="/" className="transition-opacity hover:opacity-85"><Brand /></Link></div></header>
        <main className="mx-auto max-w-2xl px-5 py-24 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-bad/40 bg-bad/10"><AlertTriangle className="h-5 w-5 text-bad" /></div>
          <h1 className="font-display mt-5 text-2xl font-bold">Audit failed</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-mut">{error ?? "Report unavailable."}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-acc px-5 py-2.5 text-sm font-bold text-acctext hover:bg-accdeep">Retry <ArrowUpRight className="h-4 w-4" /></Link>
        </main></div>
    );
  }

  const brand = (r.meta.title.split(/[|–—-]/)[0] || r.domain).trim().slice(0, 28);
  const tagline = (r.meta.description || r.meta.title || `Rebuilding ${r.domain}`).slice(0, 110);

  return (
    <div className="min-h-screen">
      <Toaster />
      <ChatPanel analysisId={id} domain={r.domain} open={chatOpen} onClose={() => setChatOpen(false)} seed={chatSeed} onSeedConsumed={() => setChatSeed(null)} />

      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="transition-opacity hover:opacity-85"><Brand /></Link>
          <div className="flex items-center gap-2">
            <Button kind="outline" onClick={() => quickAudit(r.domain)} className="!py-1.5 text-[12.5px]"><RefreshCw className="h-3.5 w-3.5" /> Re-run</Button>
            <Button kind="outline" onClick={() => openChat()} className="!py-1.5 text-[12.5px]"><Bot className="h-3.5 w-3.5" /> Copilot</Button>
            <a href="/" className="rounded-md border border-line2 bg-panel2 px-3.5 py-1.5 text-[12.5px] font-bold text-mut hover:text-ink">New audit</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-6">
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.16em] text-acc">Audit report · <ClientTime date={r.fetchedAt} full /></div>
            <h1 className="font-display mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{r.domain}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <a href={r.finalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-mut hover:text-acc">{r.finalUrl} <ExternalLink className="h-3 w-3" /></a>
              <Chip tone="acc">{r.category}</Chip>
              {r.tech.slice(0, 4).map((t) => <Chip key={t}>{t}</Chip>)}
              {r.connectedApps && r.connectedApps.length > 0 && (
                <span className="ml-1 inline-flex flex-wrap items-center gap-1">
                  {r.connectedApps.map((a) => (
                    <Chip key={a.name} tone={a.category === "social" ? "acc" : a.category === "payments" ? "ok" : a.category === "ads" ? "warn" : "mut"}>{a.name}</Chip>
                  ))}
                </span>
              )}
              <Chip tone={r.https ? "ok" : "bad"}>{r.https ? "HTTPS" : "HTTP"}</Chip>
              {r.lighthouse && <Chip tone="acc">Lighthouse: {r.lighthouse.performance}/{r.lighthouse.accessibility}/{r.lighthouse.seo}/{r.lighthouse.bestPractices}</Chip>}
              {r.security && <Chip tone={r.security.score >= 70 ? "ok" : r.security.score >= 40 ? "warn" : "bad"}>Security: {r.security.score}/100</Chip>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ScoreDial value={r.scores.overall} label="Overall" size={110} stroke={9} />
            <div className="font-data hidden text-[11.5px] leading-5 text-mut sm:block">
              <div>{r.fetchMs} ms TTFB</div>
              <div>{r.sizeKb} KB HTML</div>
              <div>{actionable.length} issues · {passes.length} passes</div>
              {r.lighthouse && <div>LH {r.lighthouse.strategy}</div>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sticky top-[57px] z-20 -mx-5 border-b border-line bg-bg/95 px-5 py-2 backdrop-blur">
          <div className="flex gap-1 overflow-x-auto">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className="whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-bold text-mut transition-colors hover:bg-panel2 hover:text-ink">{n.label}</a>)}
          </div>
        </nav>

        {/* Overview */}
        <section id="overview" className="scroll-mt-28 pt-8">
          <SectionTitle kicker="01 · Overview" title="Lighthouse + heuristic scores from a live fetch" />
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Panel className="p-5">
              <div className="grid grid-cols-3 gap-y-6 sm:grid-cols-6">
                <ScoreDial value={r.scores.seo} label="SEO" size={76} stroke={6} />
                <ScoreDial value={r.scores.accessibility} label="A11y" size={76} stroke={6} />
                <ScoreDial value={r.scores.security} label="Security" size={76} stroke={6} />
                <ScoreDial value={r.scores.performance} label="Perf" size={76} stroke={6} />
                <ScoreDial value={r.scores.bestPractices} label="Practices" size={76} stroke={6} />
                <ScoreDial value={r.scores.ux} label="UX" size={76} stroke={6} />
              </div>
              {r.lighthouse && (
                <div className="mt-5 border-t border-line pt-4">
                  <div className="font-data mb-2 text-[10.5px] uppercase tracking-[0.12em] text-acc">Lighthouse metrics</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {r.lighthouse.metrics.slice(0, 5).map((m) => (
                      <div key={m.id} className="rounded border border-line bg-panel2 px-2.5 py-2">
                        <div className="font-data truncate text-[9px] uppercase text-faint">{m.id.replace(/-/g, " ")}</div>
                        <div className="font-data mt-0.5 text-[13px] font-bold text-ink">{m.displayValue}</div>
                        {m.score != null && <div className="font-data text-[10px] text-faint">Score: {m.score}/100</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {r.screenshot && (
                <div className="mt-4">
                  <div className="font-data mb-2 text-[10.5px] uppercase tracking-[0.12em] text-faint">Page screenshot</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/jpeg;base64,${r.screenshot}`} alt="Page screenshot" className="max-h-48 rounded border border-line object-contain" />
                </div>
              )}
            </Panel>
            <div className="space-y-3">
              <Panel className="p-5">
                <div className="font-data mb-3 text-[10.5px] uppercase tracking-[0.12em] text-faint">Security headers</div>
                <div className="space-y-1.5">
                  {r.headers.map((h) => (
                    <div key={h.name} className="flex items-center justify-between gap-2 rounded border border-line bg-panel2 px-2.5 py-1.5">
                      <span className="font-data truncate text-[11px] text-mut">{h.name}</span>
                      {h.present ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" /> : <FileWarning className="h-3.5 w-3.5 shrink-0 text-warn" />}
                    </div>
                  ))}
                </div>
              </Panel>
              {r.security && (
                <Panel className="p-5">
                  <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-acc" /><span className="font-display text-[14px] font-bold">Security audit</span></div>
                  <div className="mt-3 space-y-2 text-[12.5px]">
                    <div className="flex justify-between"><span className="text-mut">SSL</span><span className={r.security.ssl?.valid ? "text-ok" : "text-bad"}>{r.security.ssl?.valid ? "Valid" : r.https ? "Verified" : "N/A"}</span></div>
                    {r.security.ssl?.daysUntilExpiry != null && <div className="flex justify-between"><span className="text-mut">SSL expires</span><span className="text-ink">{r.security.ssl.daysUntilExpiry} days</span></div>}
                    <div className="flex justify-between"><span className="text-mut">CORS issues</span><span className={r.security.cors?.issues.length ? "text-warn" : "text-ok"}>{r.security.cors?.issues.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-mut">CVEs found</span><span className={r.security.vulnerabilities?.length ? "text-bad" : "text-ok"}>{r.security.vulnerabilities?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-mut">Source maps exposed</span><span className={r.security.sourceMaps?.length ? "text-warn" : "text-ok"}>{r.security.sourceMaps?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-mut">Sensitive comments</span><span className={r.security.sensitiveComments?.length ? "text-warn" : "text-ok"}>{r.security.sensitiveComments?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-mut">Mixed content</span><span className={r.security.mixedContent ? "text-bad" : "text-ok"}>{r.security.mixedContent}</span></div>
                  </div>
                  {r.security.vulnerabilities?.length ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="font-data mb-1.5 text-[10px] uppercase text-warn">Vulnerabilities</div>
                      {r.security.vulnerabilities.map((v) => (
                        <div key={v.id} className="mb-1.5 rounded border border-bad/30 bg-bad/[0.04] px-2 py-1.5 text-[11.5px]">
                          <span className="font-bold text-bad">[{v.severity}]</span> <span className="text-ink">{v.title}</span>
                          <span className="ml-1 font-data text-faint">({v.package})</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {r.security.sourceMaps?.length ? (
                    <div className="mt-2 border-t border-line pt-2">
                      <div className="font-data mb-1.5 text-[10px] uppercase text-warn">Exposed source maps</div>
                      {r.security.sourceMaps.map((sm) => <div key={sm.url} className="font-data text-[11px] text-mut">{sm.url}</div>)}
                    </div>
                  ) : null}
                </Panel>
              )}
            </div>
          </div>
        </section>

        {/* Agents */}
        <section id="agents" className="scroll-mt-28 pt-12">
          <SectionTitle kicker="02 · Agent pipeline" title="What each expert concluded" />
          <div className="grid gap-3 lg:grid-cols-2">
            {r.agents.filter((a) => a.id !== "prompts").map((a) => <AgentCard key={a.id} a={a} onDeepDive={deepDive} />)}
          </div>
        </section>

        {/* Findings */}
        <section id="findings" className="scroll-mt-28 pt-12">
          <SectionTitle kicker="03 · Findings" title={`${actionable.length} issues · ${passes.length} passes`} right={
            <div className="flex gap-1.5">
              <Chip tone="bad">{allFindings.filter((f) => f.severity === "critical").length} critical</Chip>
              <Chip tone="warn">{allFindings.filter((f) => f.severity === "warning").length} warning</Chip>
            </div>
          } />
          {actionable.length === 0 ? (
            <Panel className="p-8 text-center text-[13.5px] text-mut">No defects found.</Panel>
          ) : (
            <div className="space-y-2">{actionable.map((f, i) => <FindingRow key={`${f.agent}:${f.id}:${i}`} f={f} onFindTools={onFindTools} />)}</div>
          )}
          {passes.length > 0 && (
            <details className="mt-4 rounded-md border border-line bg-panel">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-mut">{passes.length} checks passing — view</summary>
              <div className="space-y-1.5 border-t border-line px-4 py-3.5">
                {passes.map((p, i) => (
                  <div key={`${p.agent}:${p.id}:${i}`} className="flex items-start gap-2.5 text-[12.5px] text-mut">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                    <span><span className="font-bold text-ink">{p.title}.</span> {p.detail}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Competitors */}
        <section id="competitors" className="scroll-mt-28 pt-12">
          <SectionTitle kicker="04 · Market position" title="Competitors & novelty validation" />
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Panel className="overflow-x-auto">
              {r.competitors.length === 0 ? (
                <div className="p-6 text-[13px] leading-relaxed text-mut">
                  <div className="flex items-center gap-2 font-bold text-ink"><Target className="h-4 w-4 text-warn" /> Competitor mapping needs AI layer</div>
                  <p className="mt-2">Add an API key to get 3–5 positioned rivals with overlap analysis.</p>
                </div>
              ) : (
                <table className="w-full text-left text-[12.5px]">
                  <thead><tr className="border-b border-line font-data text-[10.5px] uppercase tracking-[0.12em] text-faint">
                    <th className="px-4 py-2.5 font-semibold">Competitor</th><th className="px-4 py-2.5 font-semibold">Positioning</th>
                    <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Overlap / edge</th><th className="px-4 py-2.5 font-semibold">Threat</th>
                  </tr></thead>
                  <tbody>{r.competitors.map((c) => (
                    <tr key={c.name} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-acc">{c.name}</a> : c.name}</div>
                        {c.url && <button onClick={() => c.url && quickAudit(c.url)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-acc hover:underline"><Play className="h-3 w-3" /> Audit this competitor</button>}
                      </td>
                      <td className="px-4 py-3 text-mut">{c.positioning}</td>
                      <td className="hidden px-4 py-3 text-mut md:table-cell"><div>{c.overlap}</div><div className="mt-0.5 text-[11.5px] text-faint">Edge: {c.differentiation}</div></td>
                      <td className="px-4 py-3"><Chip tone={c.threat === "high" ? "bad" : c.threat === "medium" ? "warn" : "ok"}>{c.threat}</Chip></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Panel>
            <Panel className="p-5">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-acc" /><span className="font-display text-[14px] font-bold">Novelty</span></div>
              <div className="mt-4 flex items-center gap-4"><ScoreDial value={r.novelty.score} size={84} stroke={7} showLabel={false} /><p className="text-[12.5px] leading-relaxed text-mut">{r.novelty.verdict}</p></div>
              <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
                {r.novelty.notes.map((n) => <li key={n} className="flex gap-2 text-[12px] leading-snug text-mut"><span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-acc" />{n}</li>)}
              </ul>
            </Panel>
          </div>
        </section>

        {/* Concepts */}
        <section id="concepts" className="scroll-mt-28 pt-12">
          <SectionTitle kicker="05 · Design optimization" title="Three redesign concepts, previewed" />
          <div className="grid gap-4 lg:grid-cols-3">{r.concepts.map((c) => <ConceptCard key={c.id} c={c} brand={brand} tagline={tagline} domain={r.domain} onApply={(prompt) => openChat(prompt)} />)}</div>
        </section>

        {/* Prompts */}
        <section id="prompts" className="scroll-mt-28 pt-12">
          <SectionTitle kicker="06 · Corrective prompts" title="Paste these into your AI workspace" />
          {r.prompts.length === 0 ? (
            <Panel className="p-8 text-center text-[13.5px] text-mut">No actionable issues.</Panel>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {r.prompts.map((p) => (
                <Panel key={p.id} className={`flex flex-col p-4 ${p.id === "mega" ? "border-acc/40 lg:col-span-2" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="flex items-center gap-2">{p.id === "mega" && <TerminalSquare className="h-4 w-4 text-acc" />}<span className="text-[13.5px] font-bold text-ink">{p.title}</span></div><div className="font-data mt-1 text-[10.5px] uppercase tracking-wide text-faint">{p.target}</div></div>
                    <div className="flex items-center gap-2">
                      <Button kind="outline" onClick={() => openChat(p.prompt)} className="!px-2.5 !py-1.5 text-[11.5px]"><Send className="h-3 w-3" /> Send to agent</Button>
                      <CopyButton text={p.prompt} />
                    </div>
                  </div>
                  <pre className="mt-3 max-h-52 flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-bg px-3.5 py-3 font-data text-[11.5px] leading-relaxed text-mut">{p.prompt}</pre>
                </Panel>
              ))}
            </div>
          )}
        </section>

        {/* Tools */}
        <section id="tools" ref={toolsRef} className="scroll-mt-28 pt-12">
          <SectionTitle kicker="07 · GitHub tool finder" title="Open-source fixes for each weakness" right={
            <div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input defaultValue={toolQuery ?? ""} key={toolQuery ?? "init"} onKeyDown={(e) => { if (e.key === "Enter") searchTools((e.target as HTMLInputElement).value); }}
                placeholder="Search GitHub…" className="w-52 rounded-md border border-line2 bg-bg py-1.5 pl-8 pr-2 font-data text-[12px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none" />
            </div>
          } />
          {ghQueries.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{ghQueries.map((q) => (
            <button key={q} onClick={() => searchTools(q)} className={`rounded-full border px-3 py-1 text-[11.5px] font-bold transition-colors ${toolQuery === q ? "border-acc/60 bg-acc/10 text-acc" : "border-line2 bg-panel2 text-mut hover:text-ink"}`}>{q}</button>
          ))}</div>}
          {toolBusy ? <Panel className="flex items-center justify-center gap-2.5 p-10 text-[13px] font-semibold text-mut"><Spinner className="h-4 w-4 text-acc" /> Searching GitHub…</Panel>
            : toolResults === null ? <Panel className="p-10 text-center text-[13px] text-mut"><PackageSearch className="mx-auto mb-2 h-5 w-5 text-faint" />{ghQueries.length ? "Loading recommended tools…" : "Search above."}</Panel>
            : toolResults.length === 0 ? <Panel className="p-10 text-center text-[13px] text-mut">{toolNote ?? "No repos matched."}</Panel>
            : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {toolResults.filter((repo) => !declined.has(repo.name)).map((repo) => {
                  const isInstalled = installed.has(repo.name);
                  return (
                    <div key={repo.name} className="flex flex-col rounded-lg border border-line bg-panel p-4">
                      <div className="flex items-center justify-between gap-2">
                        <a href={repo.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 font-data text-[12.5px] font-bold text-acc hover:underline"><GhIcon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{repo.name}</span></a>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint" />
                      </div>
                      <p className="mt-2 line-clamp-2 min-h-[32px] text-[12px] leading-snug text-mut">{repo.description || "No description."}</p>
                      <div className="mt-3 flex items-center gap-3 font-data text-[10.5px] uppercase tracking-wide text-faint">
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-warn" /> {repo.stars.toLocaleString()}</span>
                        {repo.language && <span>{repo.language}</span>}
                      </div>
                      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
                        {isInstalled ? (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Installed</span>
                        ) : (
                          <Button kind="outline" onClick={() => installSkill(repo)} disabled={installing === repo.name} className="!px-2.5 !py-1.5 text-[11.5px]">
                            {installing === repo.name ? <Spinner className="h-3 w-3" /> : <PackageSearch className="h-3 w-3" />} Install skill
                          </Button>
                        )}
                        <button onClick={() => declineTool(repo.name)} className="rounded border border-line2 bg-panel2 px-2.5 py-1.5 text-[11.5px] font-bold text-mut transition-colors hover:border-bad/40 hover:text-bad">Decline</button>
                      </div>
                    </div>
                  );
                })}</div>}
        </section>

        <section className="mt-16">
          <Panel className="flex flex-wrap items-center justify-between gap-4 border-acc/25 bg-panel2 p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-acc/15 text-acc"><MessageSquare className="h-5 w-5" /></span>
              <div><div className="font-display text-[15px] font-bold">Debrief with the audit copilot</div><div className="text-[12.5px] text-mut">The full report is in context.</div></div></div>
            <Button onClick={() => setChatOpen(true)}><Bot className="h-4 w-4" /> Open chat</Button>
          </Panel>
        </section>
      </main>

      <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-acc text-acctext shadow-xl transition-transform hover:scale-105" aria-label="Open copilot"><Bot className="h-5 w-5" /></button>
    </div>
  );
}

function AgentCard({ a, onDeepDive }: { a: AgentSection; onDeepDive?: (a: AgentSection) => void }) {
  const meta = AGENTS.find((x) => x.id === a.id);
  const icon = a.id === "market" ? <TrendingUp className="h-4 w-4" /> : a.id === "idea" ? <Target className="h-4 w-4" /> : a.id === "business" ? <TerminalSquare className="h-4 w-4" /> : a.id === "gaps" ? <Search className="h-4 w-4" /> : a.id === "ux" ? <LayoutTemplate className="h-4 w-4" /> : a.id === "compliance" ? <FileWarning className="h-4 w-4" /> : a.id === "security" ? <ShieldAlert className="h-4 w-4" /> : a.id === "qa" ? <Bug className="h-4 w-4" /> : <RadarIcon />;
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-panel3 text-acc">{icon}</span>
          <div><div className="font-display text-[14px] font-bold leading-tight">{a.name}</div><div className="font-data text-[10px] uppercase tracking-wide text-faint">{meta?.tagline}</div></div></div>
        <Chip tone={a.source === "heuristic" ? "mut" : "acc"}>{a.source === "hybrid" ? "measured + AI" : a.source}</Chip>
      </div>
      <p className="mt-3.5 text-[12.5px] leading-relaxed text-mut">{a.summary}</p>
      {a.metrics && <div className="mt-3.5 grid grid-cols-3 gap-1.5">{a.metrics.map((m) => (
        <div key={m.label} className="rounded border border-line bg-panel2 px-2 py-1.5"><div className="font-data truncate text-[10px] uppercase text-faint">{m.label}</div><div className="font-data truncate text-[12px] font-bold text-ink">{m.value}</div></div>
      ))}</div>}
      {a.insights.length > 0 && <ul className="mt-3.5 space-y-1.5 border-t border-line pt-3">{a.insights.slice(0, 5).map((ins) => (
        <li key={ins} className="flex gap-2 text-[12px] leading-snug text-ink/80"><span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-acc" />{ins}</li>
      ))}</ul>}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        {a.findings.length > 0
          ? <a href="#findings" className="inline-flex items-center gap-1 text-[12px] font-bold text-acc hover:underline">{a.findings.length} finding{a.findings.length > 1 ? "s" : ""} <ChevronRight className="h-3 w-3" /></a>
          : <span className="text-[11.5px] text-faint">No findings flagged</span>}
        <button onClick={() => onDeepDive?.(a)} className="inline-flex items-center gap-1.5 rounded-md border border-line2 bg-panel2 px-2.5 py-1.5 text-[11.5px] font-bold text-ink transition-colors hover:border-acc/50 hover:text-acc"><Play className="h-3 w-3" /> Deep dive</button>
      </div>
    </Panel>
  );
}

function RadarIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 0 1 0 20" /><path d="M12 2a10 10 0 0 1 0 14" /><path d="M12 2a5 5 0 0 1 0 8" /><circle cx="12" cy="12" r="2" /></svg>); }
function GhIcon({ className = "h-3.5 w-3.5" }: { className?: string }) { return (<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>); }
