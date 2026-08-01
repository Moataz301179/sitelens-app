"use client";

import {
  Activity, AlertTriangle, Check, ChevronDown, ChevronUp, Coins, Cpu, Crown,
  FileText, Layers, ListChecks, Megaphone, Play, Radar, RefreshCw, Settings2,
  Square, Target, TrendingUp, Users, Wrench, X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firstAvailableProvider, loadKeys } from "@/lib/keys";
import { Button, Chip, Panel, Spinner, toast } from "./ui";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Status { running: boolean; ticks: number; lastRunAt: string | null; decisions: number; executions: number; pendingPosts: number; }
interface CrewMember { role: string; label: string; domain: string; blurb: string; decisions: number; approved: number; insights: number; actions: number; executions: number; avgConfirmation: number | null; trusted: boolean; }
interface DashDecision { id: string; role: string; decision: string; rationale: string; approved: boolean; risk: string; confidence: number; }
interface DashInsight { id: string; category: string; owner: string; insight: string; impact: string; urgency: string; confidence: number; }
interface DashAction { id: string; title: string; owner: string; priority: string; status: string; dueDate: string; }
interface DashExecution { id: string; role: string; decision: string; status: string; confirmation: number | null; }
interface DashboardData {
  status: Status;
  lastRun: { id: string; timestamp: string; summary: string } | null;
  crew: CrewMember[];
  decisions: DashDecision[];
  insights: DashInsight[];
  actionItems: DashAction[];
  executions: DashExecution[];
}

type LucideIcon = typeof Crown;

/* ------------------------------------------------------------------ */
/* Role metadata                                                       */
/* ------------------------------------------------------------------ */

const ROLE_ICONS: Record<string, LucideIcon> = {
  ceo: Crown, cfo: TrendingUp, cto: Cpu, coo: Settings2, cmo: Megaphone,
  cro: Target, cio: Radar, swe: Wrench,
};
const roleIcon = (role: string): LucideIcon => ROLE_ICONS[role] ?? Users;
const roleLabel = (role: string): string => {
  const map: Record<string, string> = { ceo: "CEO", cfo: "CFO", cto: "CTO", coo: "COO", cmo: "CMO", cro: "CRO", cio: "CIO", swe: "SWE" };
  return map[role] ?? role.toUpperCase().replace(/_/g, " ");
};
const roleTone = (role: string): "acc" | "mut" | "ok" | "warn" | "bad" => {
  if (role === "swe") return "ok";
  if (role === "cmo" || role === "cro") return "warn";
  return "acc";
};

function prioTone(p: string): "acc" | "mut" | "ok" | "warn" | "bad" {
  if (p === "critical") return "bad";
  if (p === "high") return "warn";
  if (p === "medium") return "acc";
  return "mut";
}
function impactTone(i: string): "acc" | "mut" | "ok" | "warn" | "bad" {
  if (i === "high") return "warn";
  if (i === "medium") return "acc";
  return "mut";
}
function execTone(s: string): "acc" | "mut" | "ok" | "warn" | "bad" {
  if (s === "succeeded") return "ok";
  if (s === "failed") return "bad";
  if (s === "running" || s === "queued") return "acc";
  return "mut";
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Browser key → exec engine: send the user's key so the crew works    */
/* with zero server config (mirrors how audits get their key).         */
/* ------------------------------------------------------------------ */

const DEFAULT_MODELS: Record<string, string> = {
  openrouter: "openai/gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  zai: "glm-4.5-flash",
  opencode: "openai/gpt-5-nano",
};

function creds(): { provider: string; model: string; apiKey: string } {
  const k = loadKeys();
  const p = firstAvailableProvider(k) ?? "openrouter";
  const apiKey = (k as unknown as Record<string, string>)[p] ?? "";
  const model = k.model?.[p] || DEFAULT_MODELS[p] || "";
  return { provider: p, model, apiKey };
}

function credHeaders(): Record<string, string> {
  const c = creds();
  const h: Record<string, string> = {};
  if (c.apiKey) h["x-api-key"] = c.apiKey;
  if (c.provider) h["x-api-provider"] = c.provider;
  if (c.model) h["x-api-model"] = c.model;
  return h;
}

const STAT_TONE: Record<string, string> = { acc: "text-acc", ok: "text-ok", bad: "text-bad", warn: "text-warn" };

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-md border border-line bg-bg/60 px-3 py-2.5">
      <div className="font-data text-[10px] uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className={`font-data mt-0.5 text-lg font-bold ${tone ? STAT_TONE[tone] : "text-ink"}`}>{value}</div>
      {hint && <div className="text-[11px] text-mut">{hint}</div>}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-[12.5px] text-faint">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(false);      // engine start/stop/refresh
  const [running, setRunning] = useState(false); // a crew tick in progress
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/executive/dashboard", { headers: credHeaders() });
      if (res.ok) setData(await res.json());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runCrew = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/executive/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tick", ...creds() }),
      });
      const r = await res.json().catch(() => null);
      if (r?.ok) toast(`Crew run done — ${r.decisions ?? 0} decisions approved, ${r.insights ?? 0} insights`, "ok");
      else toast("Crew run finished (see output below)", "mut");
    } catch {
      toast("Crew run failed", "bad");
    } finally {
      setRunning(false);
      await load();
    }
  };

  const engineAction = async (action: "start" | "stop") => {
    setBusy(true);
    try {
      const res = await fetch("/api/executive/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...creds() }),
      });
      const r = await res.json().catch(() => null);
      toast(r?.ok ? (action === "start" ? "Engine started" : "Engine stopped") : "Engine action failed", r?.ok ? "ok" : "bad");
    } catch {
      toast("Engine action failed", "bad");
    } finally {
      setBusy(false);
      await load();
    }
  };

  const fetchReport = async () => {
    setReportOpen(true);
    if (report) return;
    setReportBusy(true);
    try {
      const res = await fetch("/api/executive/report", { headers: credHeaders() });
      const r = await res.json().catch(() => null);
      if (res.ok && r) setReport(r);
      else toast("Daily report unavailable", "bad");
    } catch {
      toast("Daily report failed", "bad");
    } finally {
      setReportBusy(false);
    }
  };

  const s = data?.status;
  const noActivity = data && data.crew.every((c) => c.decisions === 0 && c.insights === 0 && c.actions === 0 && c.executions === 0);

  return (
    <div className="space-y-5">
      {/* ── status + controls ── */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold ${s?.running ? "border-ok/40 bg-ok/10 text-ok" : "border-line2 bg-panel2 text-mut"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${s?.running ? "animate-pulse bg-ok" : "bg-faint"}`} />
              {s?.running ? "Engine running" : "Engine stopped"}
            </span>
            <span className="font-data text-[11.5px] text-mut">ticks: {s?.ticks ?? 0}</span>
            {s?.lastRunAt && (
              <span className="font-data text-[11.5px] text-mut">
                last run: {new Date(s.lastRunAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className="font-data hidden text-[11.5px] text-mut sm:block">
              {s?.decisions ?? 0} decisions · {s?.executions ?? 0} executions · {s?.pendingPosts ?? 0} pending posts
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button kind="primary" onClick={runCrew} disabled={running || busy} className="!px-4 !py-2 text-[13px]">
              {running ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Running crew…" : "Run crew once"}
            </Button>
            <Button kind="outline" onClick={() => engineAction(s?.running ? "stop" : "start")} disabled={running || busy} className="!px-3 !py-2 text-[13px]">
              {s?.running ? <Square className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
              {s?.running ? "Stop engine" : "Start engine"}
            </Button>
            <Button kind="outline" onClick={fetchReport} disabled={reportBusy} className="!px-3 !py-2 text-[13px]">
              {reportBusy ? <Spinner className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              Daily report
            </Button>
            <Button kind="ghost" onClick={load} disabled={busy || running} className="!px-3 !py-2 text-[13px]">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        {data?.lastRun?.summary && (
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-mut">
            <span className="font-semibold text-ink">Last run:</span> {data.lastRun.summary}
          </p>
        )}
      </Panel>

      {/* ── crew roster ── */}
      {!data ? (
        <Panel className="flex items-center justify-center p-10 text-mut">
          <Spinner className="mr-2 h-4 w-4 text-acc" /> Loading executive team…
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.crew.map((m) => {
            const Icon = roleIcon(m.role);
            return (
              <div key={m.role} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-acc/12 text-acc">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-[14px] font-bold text-ink">{m.label}</span>
                      {m.avgConfirmation != null && (
                        <span className={`font-data text-[10px] font-bold ${m.trusted ? "text-ok" : "text-bad"}`} title="measured confirmation">
                          {m.avgConfirmation}%✓
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-faint">{m.domain}</div>
                  </div>
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-[12px] leading-snug text-mut">{m.blurb}</p>
                <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-line pt-2.5">
                  <div className="text-center"><div className="font-data text-[13px] font-bold text-ink">{m.decisions}</div><div className="font-data text-[9px] uppercase tracking-wide text-faint">decs</div></div>
                  <div className="text-center"><div className="font-data text-[13px] font-bold text-ok">{m.approved}</div><div className="font-data text-[9px] uppercase tracking-wide text-faint">ok</div></div>
                  <div className="text-center"><div className="font-data text-[13px] font-bold text-acc">{m.insights}</div><div className="font-data text-[9px] uppercase tracking-wide text-faint">intel</div></div>
                  <div className="text-center"><div className="font-data text-[13px] font-bold text-warn">{m.actions}</div><div className="font-data text-[9px] uppercase tracking-wide text-faint">acts</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── activity: decisions / insights / actions / executions ── */}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Layers className="h-4 w-4 text-acc" />
              <span className="font-display text-[13px] font-bold text-ink">Decisions</span>
              <Chip tone="mut">{data.decisions.length}</Chip>
            </div>
            {data.decisions.length === 0 ? (
              <EmptyNote>No decisions yet — click “Run crew once”.</EmptyNote>
            ) : (
              <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
                {data.decisions.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.approved ? <Check className="h-3.5 w-3.5 shrink-0 text-ok" /> : <X className="h-3.5 w-3.5 shrink-0 text-faint" />}
                      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{d.decision}</span>
                      <Chip tone={roleTone(d.role)}>{roleLabel(d.role)}</Chip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
                      <Chip tone={d.approved ? "ok" : "mut"}>{d.approved ? "approved" : "rejected"}</Chip>
                      <Chip tone={d.risk === "critical" ? "bad" : d.risk === "high" ? "warn" : "mut"}>{d.risk} risk</Chip>
                      {d.rationale && <span className="text-[11.5px] text-mut">{d.rationale.slice(0, 140)}{d.rationale.length > 140 ? "…" : ""}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <ListChecks className="h-4 w-4 text-acc" />
              <span className="font-display text-[13px] font-bold text-ink">Action items</span>
              <Chip tone="mut">{data.actionItems.length}</Chip>
            </div>
            {data.actionItems.length === 0 ? (
              <EmptyNote>No action items yet.</EmptyNote>
            ) : (
              <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
                {data.actionItems.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">{a.title}</span>
                      <Chip tone={roleTone(a.owner)}>{roleLabel(a.owner)}</Chip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-0">
                      <Chip tone={prioTone(a.priority)}>{a.priority}</Chip>
                      <Chip tone="mut">{a.status}</Chip>
                      {a.dueDate && <span className="font-data text-[11px] text-faint">due {a.dueDate}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <TrendingUp className="h-4 w-4 text-acc" />
              <span className="font-display text-[13px] font-bold text-ink">Executions & measurement</span>
              <Chip tone="mut">{data.executions.length}</Chip>
            </div>
            {data.executions.length === 0 ? (
              <EmptyNote>No executions yet — approved decisions execute automatically (dry-run by default).</EmptyNote>
            ) : (
              <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
                {data.executions.map((e) => (
                  <li key={e.id + e.status} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{e.decision}</span>
                      <Chip tone={roleTone(e.role)}>{roleLabel(e.role)}</Chip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Chip tone={execTone(e.status)}>{e.status}</Chip>
                      {e.confirmation != null && <Chip tone={e.confirmation >= 0.5 ? "ok" : "warn"}>{Math.round(e.confirmation * 100)}% confirmed</Chip>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Radar className="h-4 w-4 text-acc" />
              <span className="font-display text-[13px] font-bold text-ink">Insights</span>
              <Chip tone="mut">{data.insights.length}</Chip>
            </div>
            {data.insights.length === 0 ? (
              <EmptyNote>No insights yet.</EmptyNote>
            ) : (
              <ul className="max-h-[340px] divide-y divide-line overflow-y-auto">
                {data.insights.map((i) => (
                  <li key={i.id} className="px-4 py-3">
                    <p className="text-[13px] leading-snug text-ink">{i.insight}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Chip tone={roleTone(i.owner)}>{roleLabel(i.owner)}</Chip>
                      <Chip tone={impactTone(i.impact)}>{i.impact} impact</Chip>
                      <Chip tone="mut">{i.urgency.replace(/_/g, " ")}</Chip>
                      {i.confidence != null && <span className="font-data text-[11px] text-faint">{Math.round(i.confidence * 100)}% conf</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ── daily report ── */}
      {reportOpen && (
        <Panel className="overflow-hidden">
          <button onClick={() => setReportOpen(!reportOpen)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="flex items-center gap-2 font-display text-[13px] font-bold text-ink">
              <FileText className="h-4 w-4 text-acc" /> Daily executive report
            </span>
            {reportBusy ? <Spinner className="h-4 w-4 text-acc" /> : reportOpen ? <ChevronUp className="h-4 w-4 text-mut" /> : <ChevronDown className="h-4 w-4 text-mut" />}
          </button>
          {report && <ReportBody report={report} />}
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Daily report body                                                   */
/* ------------------------------------------------------------------ */

function ReportBody({ report }: { report: Record<string, unknown> }) {
  const es = (report.executiveSummary ?? {}) as Record<string, unknown>;
  const fin = (report.financials ?? {}) as Record<string, unknown>;
  const rev = (fin.revenue ?? {}) as Record<string, unknown>;
  const profit = (fin.profitability ?? {}) as Record<string, unknown>;
  const cf = (fin.cashFlow ?? {}) as Record<string, unknown>;
  const mkt = (report.marketing ?? {}) as Record<string, unknown>;
  const roi = (mkt.roi ?? {}) as Record<string, unknown>;
  const sales = (report.sales ?? {}) as Record<string, unknown>;
  const pipeline = (sales.pipeline ?? {}) as Record<string, unknown>;
  const tech = (report.technology ?? {}) as Record<string, unknown>;
  const infra = (tech.infrastructure ?? {}) as Record<string, unknown>;
  const sec = (tech.security ?? {}) as Record<string, unknown>;
  const insights = (report.strategicInsights ?? []) as { insight: string; impact: string; urgency: string }[];
  const actions = (report.actionItems ?? []) as { title: string; priority: string; status: string }[];

  const num = (v: unknown): string => (typeof v === "number" ? String(v) : v != null ? String(v) : "—");

  return (
    <div className="border-t border-line p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Health" value={num(es.overallHealth)} hint={num(es.outlook)} tone="acc" />
        <Stat label="Revenue vs target" value={`${num(es.revenueVsTarget)}%`} tone={Number(es.revenueVsTarget) < 0 ? "bad" : "ok"} />
        <Stat label="Profit vs target" value={`${num(es.profitVsTarget)}%`} tone={Number(es.profitVsTarget) < 0 ? "bad" : "ok"} />
        <Stat label="Top priority" value="—" hint={num(es.topPriority)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={num(rev.monthlyRecurring)} hint="monthly recurring" />
        <Stat label="Runway" value={num(cf.runway)} hint="months" />
        <Stat label="Net margin" value={num(profit.netMargin)} hint="%" />
        <Stat label="LTV : CAC" value={num(roi.ltvToCac)} hint="unit economics" />
      </div>

      {Array.isArray(es.keyAchievements) && es.keyAchievements.length > 0 && (
        <Section title="Key achievements" tone="ok" icon={<Check className="h-3.5 w-3.5" />}>
          {(es.keyAchievements as string[]).map((k, i) => <li key={i} className="text-[13px] text-ink">{k}</li>)}
        </Section>
      )}
      {Array.isArray(es.criticalIssues) && es.criticalIssues.length > 0 && (
        <Section title="Critical issues" tone="bad" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          {(es.criticalIssues as string[]).map((k, i) => <li key={i} className="text-[13px] text-ink">{k}</li>)}
        </Section>
      )}
      {insights.length > 0 && (
        <Section title="Strategic insights" tone="acc" icon={<Radar className="h-3.5 w-3.5" />}>
          {insights.map((i, idx) => (
            <li key={idx} className="flex flex-wrap items-start gap-2 text-[13px] text-ink">
              <Chip tone={impactTone(i.impact)}>{i.impact}</Chip>
              <span className="flex-1">{i.insight}</span>
            </li>
          ))}
        </Section>
      )}
      {actions.length > 0 && (
        <Section title="Action items in flight" tone="warn" icon={<ListChecks className="h-3.5 w-3.5" />}>
          {actions.map((a, idx) => (
            <li key={idx} className="flex flex-wrap items-center gap-2 text-[13px] text-ink">
              <Chip tone={prioTone(a.priority)}>{a.priority}</Chip>
              <span className="flex-1">{a.title}</span>
              <Chip tone="mut">{a.status}</Chip>
            </li>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, tone, icon, children }: { title: string; tone: "ok" | "bad" | "acc" | "warn"; icon: React.ReactNode; children: React.ReactNode }) {
  const tones: Record<string, string> = { ok: "text-ok", bad: "text-bad", acc: "text-acc", warn: "text-warn" };
  return (
    <div className="mt-3 rounded-md border border-line bg-bg/50 p-3.5">
      <div className={`mb-2 flex items-center gap-1.5 font-data text-[11px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>
        {icon} {title}
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}
