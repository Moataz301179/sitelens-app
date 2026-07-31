import {
  buildConcepts,
  buildCorrectivePrompt,
  buildMegaPrompt,
  computeScoresFromSignals,
  computeScoresWithLighthouse,
  HEURISTIC_FINDINGS,
} from "./findings";
import { createAnalysis, finishAnalysis } from "./db-helpers";
import { complete, extractJson } from "./llm";
import { LlmEnrichmentSchema, type Finding, type AgentSection, type CorrectivePrompt } from "@/lib/schema";
import { getCache, setCache, createJob, updateJob } from "./queue";
import { stage1Gather } from "./analyzer";
import type { AuditEvent, ProviderCreds, LlmEnrichment, Stage1Payload, Report, AgentId } from "./types";
import { env } from "./env";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const AGENT_ORDER: AgentId[] = ["recon", "market", "idea", "business", "gaps", "ux", "compliance", "security", "qa", "prompts"];
const AGENT_ROLE: Record<AgentId, string> = {
  recon: "Site Recon", market: "Market Analyst", idea: "Idea Validator",
  business: "Business Logic Auditor", gaps: "Market Gap Finder",
  ux: "UX/UI Critic", compliance: "Compliance Officer", security: "Security Auditor",
  qa: "QA Bug Hunter", prompts: "Prompt Engineer",
};
const ROLE_FOR_PROMPT: Record<string, string> = {
  seo: "senior SEO engineer", accessibility: "WCAG accessibility specialist",
  security: "application security engineer", performance: "web performance engineer",
  ux: "senior product designer", compliance: "digital compliance consultant",
  qa: "senior QA engineer", business: "product strategist",
};

/* ─── LLM enrichment with Zod validation ───────────────────────── */

const ENRICH_SYSTEM = `You are the orchestration brain of SiteLens, a multi-agent website audit platform. You receive Stage 1 data (real measurements: Lighthouse scores, security headers, DOM heuristics, tech stack). Enrich it with semantic intelligence that a machine scan cannot see.
Respond ONLY with valid JSON matching this schema (no markdown fences):
{
 "marketAnalysis": "3-5 sentence market read: category, demand signals, positioning, channel fit",
 "competitors": [{"name":"", "url":"", "positioning":"", "overlap":"", "differentiation":"", "threat":"high|medium|low"}],
 "gaps": ["3-5 concrete market/feature gaps the site could exploit"],
 "idea": {"verdict":"validated|plausible|risky", "score":0-100, "strengths":["..."], "risks":["..."]},
 "business": {"assessment":"2-3 sentence business-logic read", "suggestions":["..."]},
 "uxNotes": [{"title":"","issue":"","improvement":""}],
 "violations": [{"title":"","detail":"","remediation":""}],
 "bugCandidates": [{"title":"","detail":""}],
 "novelty": {"score":0-100, "verdict":"one line", "notes":["..."]},
 "correctivePrompts": [{"title":"","prompt":"ready-to-paste prompt for AI coding assistant"}]
}
Give 3-5 competitors, 3-5 uxNotes, 2-4 violations, 2-4 bugCandidates, 2-4 correctivePrompts. Be specific to the signals — never generic. Be brief.`;

function stage1Brief(s: Stage1Payload): string {
  const findings = HEURISTIC_FINDINGS(s.siteSignals);
  const top = findings.filter((f) => f.severity !== "pass").slice(0, 12).map((f) => `- [${f.severity}] ${f.title}: ${f.detail}`).join("\n");
  return [
    `TARGET: ${s.finalUrl}`,
    `Title: ${s.meta.title || "(none)"}`,
    `H1: ${s.siteSignals.h1Text || "(none)"}`,
    `Words: ${s.siteSignals.wordCount} | Images: ${s.siteSignals.imgTotal} | Forms: ${s.siteSignals.forms}`,
    `Tech: ${s.tech.join(", ") || "none"}`,
    `Features: ${Object.entries(s.features).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
    `LH: Perf ${s.lighthouse?.performance ?? "N/A"}, A11y ${s.lighthouse?.accessibility ?? "N/A"}, SEO ${s.lighthouse?.seo ?? "N/A"}, BP ${s.lighthouse?.bestPractices ?? "N/A"}`,
    `Security: ${s.security?.score ?? "N/A"}/100 | SSL: ${s.security?.ssl?.valid ?? "N/A"}`,
    `TTFB: ${s.fetchMs}ms | HTML: ${s.sizeKb}KB | ${s.https ? "HTTPS" : "HTTP"}`,
    `MEASURED ISSUES:\n${top || "- none"}`,
  ].join("\n");
}

async function runLlmEnrichment(creds: ProviderCreds, stage1: Stage1Payload): Promise<LlmEnrichment | null> {
  const raw = await complete({
    provider: creds.provider, model: creds.model, apiKey: creds.apiKey,
    messages: [
      { role: "system", content: ENRICH_SYSTEM },
      { role: "user", content: stage1Brief(stage1) },
    ],
    maxTokens: 2000, temperature: 0.35, json: true,
  });
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const validated = LlmEnrichmentSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

/* ─── Report assembly ──────────────────────────────────────────── */

function assembleReport(stage1: Stage1Payload, enrichment: LlmEnrichment | null, creds: ProviderCreds | null): Report {
  const s = stage1;
  const domain = stage1.domain;
  const findings = HEURISTIC_FINDINGS(s.siteSignals);

  // Merge Lighthouse scores if available
  const scores = s.lighthouse
    ? computeScoresWithLighthouse(s.siteSignals, s.lighthouse, s.security)
    : computeScoresFromSignals(s.siteSignals, s.security);

  const agents: AgentSection[] = [
    {
      id: "recon", name: AGENT_ROLE.recon, role: "auditor", status: "done", source: "heuristic",
      summary: `Fetched ${domain} in ${s.fetchMs}ms over ${s.https ? "HTTPS" : "HTTP"} (${s.sizeKb} KB). Stack: ${s.tech.slice(0, 6).join(", ") || "none"}.`,
      metrics: [
        { label: "TTFB", value: `${s.fetchMs}ms` }, { label: "HTML", value: `${s.sizeKb}KB` },
        { label: "Status", value: String(s.status) }, { label: "Scripts", value: String(s.siteSignals.scripts) },
      ],
      insights: s.tech.length ? [`Stack: ${s.tech.join(", ")}`] : ["No framework fingerprints"],
      findings: [],
    },
    {
      id: "market", name: AGENT_ROLE.market, role: "analyst", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: enrichment?.marketAnalysis || `Heuristic read: ${stage1.category}. ${s.features.analytics ? "Analytics present." : "No analytics."} ${s.features.blog ? "Content engine detected." : "No content engine."}`,
      insights: [
        enrichment ? "AI market analysis provided" : `Category: ${stage1.category} (heuristic)`,
        s.features.analytics ? "Measurement layer present" : "Install analytics before paid acquisition",
      ],
      findings: [],
    },
    {
      id: "idea", name: AGENT_ROLE.idea, role: "validator", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: enrichment?.idea ? `AI verdict: ${enrichment.idea.verdict} (${enrichment.idea.score}/100).` : `Value prop ${s.siteSignals.wordCount < 80 ? "undersupported" : "stated"}. ${s.features.signup ? "Activation path present." : "No activation path."}`,
      insights: enrichment?.idea ? [...enrichment.idea.strengths.map((x) => `Strength — ${x}`), ...enrichment.idea.risks.map((x) => `Risk — ${x}`)] : [
        s.features.signup ? "Signup detected" : "Missing signup",
        s.features.docs ? "Docs present" : "No docs surface",
      ].slice(0, 6),
      findings: [],
    },
    {
      id: "business", name: AGENT_ROLE.business, role: "strategist", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: enrichment?.business?.assessment || `Business logic: ${s.features.pricing || s.features.payments ? "monetization detected" : "no monetization surface"}. ${s.features.login ? "Accounts present." : "No accounts."}`,
      insights: enrichment?.business?.suggestions?.map((x) => `Suggestion — ${x}`).slice(0, 5) ?? [
        s.features.pricing ? "Pricing page present" : "Define monetization model",
        s.features.liveChat ? "Live chat available" : "No live chat",
      ],
      findings: [],
    },
    {
      id: "gaps", name: AGENT_ROLE.gaps, role: "gap finder", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: enrichment?.gaps?.length ? enrichment.gaps.join("; ") : `Gaps: ${[!s.features.blog && "no content engine", !s.features.analytics && "no measurement", !s.features.docs && "no help surface"].filter(Boolean).join("; ") || "core surfaces present"}.`,
      insights: (enrichment?.gaps ?? []).map((g) => `Gap — ${g}`).slice(0, 5),
      findings: [],
    },
    {
      id: "ux", name: AGENT_ROLE.ux, role: "designer", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: `UX score ${scores.ux}/100. Nav ${s.siteSignals.landmarks?.nav ? "present" : "absent"}, ${s.siteSignals.ctaCount} CTAs, ${s.siteSignals.wordCount} words.`,
      insights: [
        s.siteSignals.landmarks?.nav ? "Navigation present" : "No nav region",
        s.siteSignals.ctaCount > 0 ? `${s.siteSignals.ctaCount} CTA surfaces` : "Zero CTAs",
      ],
      findings: findings.filter((f) => f.agent === "ux"),
    },
    {
      id: "compliance", name: AGENT_ROLE.compliance, role: "compliance officer", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: `Privacy ${s.siteSignals.hasPrivacyLink ? "linked" : "MISSING"}, terms ${s.siteSignals.hasTermsLink ? "linked" : "absent"}. ${s.siteSignals.imgMissingAlt} alt gaps, ${s.siteSignals.inputsNoLabel} unlabeled inputs.`,
      insights: [
        s.siteSignals.hasPrivacyLink ? "Privacy policy reachable" : "No privacy policy — legal exposure",
        s.siteSignals.hasTermsLink ? "Terms present" : "No terms of service",
      ],
      findings: findings.filter((f) => f.agent === "compliance"),
    },
    {
      id: "security", name: AGENT_ROLE.security, role: "security engineer", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: `Security ${s.security?.score ?? scores.security}/100. ${s.https ? "TLS active." : "NO TLS."} Missing headers: ${s.security?.headers.filter((h) => !h.present).map((h) => h.name).join(", ") || "none"}. ${s.security?.vulnerabilities?.length ? `${s.security.vulnerabilities.length} CVE(s).` : "No known CVEs."}`,
      metrics: s.security?.headers.slice(0, 8).map((h) => ({ label: h.name, value: h.present ? "set" : "missing" })),
      insights: [
        s.security?.ssl?.valid ? "SSL valid" : s.https ? "TLS handshake OK" : "No HTTPS",
        s.security?.vulnerabilities?.length ? `${s.security.vulnerabilities.length} known vulnerability(ies)` : "No known CVEs in detected libs",
        (s.security?.sourceMaps?.length ?? 0) > 0 ? `${s.security?.sourceMaps?.length} source map(s) exposed` : "No source maps exposed",
      ].filter(Boolean),
      findings: findings.filter((f) => f.agent === "security"),
    },
    {
      id: "qa", name: AGENT_ROLE.qa, role: "QA engineer", status: "done",
      source: enrichment ? "hybrid" : "heuristic",
      summary: `QA: ${s.siteSignals.duplicateIds} duplicate id(s), ${s.siteSignals.emptyHashLinks} dead links, ${s.siteSignals.loremHits} placeholder hit(s), ${s.siteSignals.todoComments} TODO leak(s).`,
      insights: [
        s.siteSignals.duplicateIds ? `${s.siteSignals.duplicateIds} duplicate DOM ids` : "DOM ids unique",
        s.siteSignals.loremHits ? "Placeholder copy LIVE" : "No placeholder copy",
      ],
      findings: findings.filter((f) => f.agent === "qa"),
    },
    {
      id: "prompts", name: AGENT_ROLE.prompts, role: "prompt engineer", status: "done",
      source: "heuristic", summary: "", insights: [], findings: [],
    },
  ];

  // Merge AI findings into relevant agents
  if (enrichment) {
    for (const note of enrichment.uxNotes.slice(0, 4)) {
      const f: Finding = { id: `ai-ux-${agents[5].findings.length}`, agent: "ux", severity: "warning", title: note.title, detail: note.issue, fix: note.improvement };
      f.prompt = buildCorrectivePrompt(f, domain);
      agents[5].findings.push(f);
    }
    for (const v of enrichment.violations.slice(0, 3)) {
      const f: Finding = { id: `ai-comp-${agents[6].findings.length}`, agent: "compliance", severity: "critical", title: v.title, detail: v.detail, fix: v.remediation };
      f.prompt = buildCorrectivePrompt(f, domain);
      agents[6].findings.push(f);
    }
    for (const b of enrichment.bugCandidates.slice(0, 3)) {
      const f: Finding = { id: `ai-qa-${agents[7].findings.length}`, agent: "qa", severity: "warning", title: b.title, detail: b.detail, fix: "Reproduce, isolate and patch." };
      agents[7].findings.push(f);
    }
  }

  // Competitors
  const competitors = (enrichment?.competitors ?? []).filter((c) => c.name).slice(0, 5).map((c) => ({
    ...c, url: c.url && /^https?:/i.test(c.url) ? c.url : null,
  }));

  // Prompts
  const allFindings = agents.flatMap((a) => a.findings);
  const prompts: CorrectivePrompt[] = buildMegaPrompt(domain, allFindings, scores);
  if (enrichment) {
    enrichment.correctivePrompts.filter((p) => p.title && p.prompt).slice(0, 4).forEach((p, i) => {
      prompts.push({ id: `ai-p${i}`, title: p.title, target: "AI-generated", prompt: p.prompt });
    });
  }

  const screenshot = s.lighthouse?.screenshot?.data ?? null;

  return {
    url: s.url, domain: s.domain, finalUrl: s.finalUrl, fetchedAt: s.fetchedAt,
    fetchMs: s.fetchMs, sizeKb: s.sizeKb, https: s.https, status: s.status,
    tech: s.tech, headers: s.security?.headers ?? [], connectedApps: s.siteSignals.connectedApps,
    meta: s.meta, scores, agents, competitors,
    concepts: buildConcepts(s.siteSignals),
    prompts: prompts.slice(0, 12),
    novelty: enrichment?.novelty ?? { score: Math.max(10, Math.min(90, 50)), verdict: "Heuristic estimate — connect an AI key for semantic validation.", notes: ["Score blends stack distinctiveness, content depth, and structured-data maturity.", "Semantic differentiation requires an LLM."] },
    llm: creds ? { provider: creds.provider, model: creds.model } : null,
    category: stage1.category,
    lighthouse: s.lighthouse,
    security: s.security,
    screenshot,
  };
}

/* ─── Public API: sync audit (backward-compatible) ─────────────── */

export async function* runAudit(rawUrl: string, creds: ProviderCreds | null): AsyncGenerator<AuditEvent> {
  const domain = rawUrl.startsWith("http") ? new URL(rawUrl).hostname.replace(/^www\./, "") : rawUrl.replace(/^www\./, "");
  const analysisId = await createAnalysis(rawUrl, domain, creds?.provider, creds?.model);
  yield { type: "started", analysisId };

  // Check cache first
  const cached = await getCache(rawUrl);
  if (cached) {
    const report = cached.report ?? assembleReport(cached.stage1, null, null);
    yield { type: "agent", agent: "recon", status: "done", section: report.agents[0] };
    for (const a of report.agents.slice(1)) {
      yield { type: "agent", agent: a.id, status: "done", section: a };
    }
    await finishAnalysis(analysisId, report, "done");
    yield { type: "done", analysisId, report };
    return;
  }

  // Stage 1: gather
  try {
    yield { type: "agent", agent: "recon", status: "running" };
    const stage1 = await stage1Gather(rawUrl);
    const report0 = assembleReport(stage1, null, null);
    await setCache(rawUrl, stage1);
    yield { type: "agent", agent: "recon", status: "done", section: report0.agents[0] };
    yield { type: "progress", message: `Lighthouse: Perf ${stage1.lighthouse?.performance ?? "N/A"}, A11y ${stage1.lighthouse?.accessibility ?? "N/A"}, Security ${stage1.security?.score ?? "N/A"}/100` };

    // Sequential agent reveal
    for (const agent of report0.agents.slice(1)) {
      yield { type: "agent", agent: agent.id, status: "running" };
      await sleep(150);
      yield { type: "agent", agent: agent.id, status: "done", section: agent };
    }

    // Stage 2: LLM enrichment (if creds provided)
    if (creds) {
      try {
        yield { type: "progress", message: `Consulting ${creds.provider}/${creds.model}…` };
        const enrichment = await runLlmEnrichment(creds, stage1);
        if (enrichment) {
          const report = assembleReport(stage1, enrichment, creds);
          for (const a of report.agents.filter((a) => a.source !== "heuristic")) {
            yield { type: "agent", agent: a.id, status: "done", section: a };
          }
          await setCache(rawUrl, stage1, report);
          await finishAnalysis(analysisId, report, "done");
          yield { type: "done", analysisId, report };
          return;
        }
      } catch (e) {
        yield { type: "progress", message: `AI layer failed (${e instanceof Error ? e.message : "unknown"}). Continuing on measured data.` };
      }
    }

    const report = assembleReport(stage1, null, creds);
    await setCache(rawUrl, stage1, report);
    await finishAnalysis(analysisId, report, "done");
    yield { type: "done", analysisId, report };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Audit failed.";
    await finishAnalysis(analysisId, null, "failed", msg);
    yield { type: "error", analysisId, message: msg };
  }
}

/* ─── Async job worker ─────────────────────────────────────────── */

export async function processJob(jobId: string, creds: ProviderCreds | null): Promise<void> {
  await updateJob(jobId, { status: "processing", stage: "stage1_gathering", attempts: 1 });

  try {
    const job = await import("./queue").then((q) => q.getJob(jobId));
    if (!job) return;

    // Stage 1
    await updateJob(jobId, { stage: "stage1_gathering", progress: 20 });
    const stage1 = await stage1Gather(job.url);
    await updateJob(jobId, { stage1Payload: stage1, stage: "stage2_synthesis", progress: 50 });

    // Stage 2
    let enrichment: LlmEnrichment | null = null;
    if (creds) {
      try {
        enrichment = await runLlmEnrichment(creds, stage1);
        await updateJob(jobId, { progress: 80 });
      } catch {
        // Continue without enrichment
      }
    }

    const report = assembleReport(stage1, enrichment, creds);
    await updateJob(jobId, { status: "completed", stage: "done", progress: 100 });
    await finishAnalysis(job.analysisId, report, "done");
  } catch (e) {
    const { WORKER_POLL_MS } = env();
    const job = await import("./queue").then((q) => q.getJob(jobId));
    const attempts = (job?.attempts ?? 0) + 1;
    if (attempts >= (job?.maxAttempts ?? 3)) {
      await updateJob(jobId, { status: "failed", error: e instanceof Error ? e.message : "Failed", attempts });
      await finishAnalysis(job?.analysisId ?? "", null, "failed", e instanceof Error ? e.message : "Failed");
    } else {
      const retryAfter = new Date(Date.now() + WORKER_POLL_MS * attempts * 2);
      await updateJob(jobId, { status: "pending", retryAfter, attempts, error: e instanceof Error ? e.message : undefined });
    }
  }
}

export { AGENT_ORDER, AGENT_ROLE, ROLE_FOR_PROMPT };
