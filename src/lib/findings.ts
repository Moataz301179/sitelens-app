import type { Finding, Scores, SiteSignals, DesignConcept, CorrectivePrompt, SecurityResult, PageSpeedResult } from "@/lib/schema";

/* ─── Scoring from signals only ────────────────────────────────── */

function clamp(v: number) { return Math.max(5, Math.min(100, Math.round(v))); }

export function computeScoresFromSignals(s: SiteSignals, sec: SecurityResult | null): Scores {
  let seo = 100, a11y = 100, perf = 100, bp = 100, ux = 100;
  if (!s.meta.title) seo -= 25; else if (s.meta.title.length < 15) seo -= 10;
  if (!s.meta.description) seo -= 12; else if (s.meta.description.length > 200) seo -= 5;
  if (!s.hasCanonical) seo -= 8;
  if (s.jsonLd === 0) seo -= 5;
  if (s.h1Count === 0) seo -= 10; else if (s.h1Count > 1) seo -= 6;
  if (!s.headingOrderOk) seo -= 4;

  if (!s.hasViewport) { a11y -= 25; }
  if (s.imgTotal > 0 && s.imgMissingAlt > 0) { a11y -= Math.min(30, Math.round((s.imgMissingAlt / s.imgTotal) * 100) / 3); }
  if (s.inputsNoLabel > 0) { a11y -= Math.min(25, s.inputsNoLabel * 6); }
  if (s.ariaCount === 0) a11y -= 8;

  if (s.fetchMs > 3000) perf -= 20; else if (s.fetchMs > 1200) perf -= 8;
  if (s.sizeKb > 400) perf -= 12;
  if (s.scripts > 25) perf -= 10;
  if (s.imgTotal > 10) perf -= 3;

  if (!s.hasFavicon) bp -= 5;
  if (!s.hasCharset) bp -= 8;
  if (!s.hasDoctype) bp -= 10;
  if (s.duplicateIds > 0) bp -= 8;
  if (s.inlineHandlers > 0) bp -= 6;
  if (s.loremHits > 0) bp -= 15;

  if (!s.landmarks?.nav) ux -= 15;
  if (s.ctaCount === 0) ux -= 18;
  if (s.wordCount < 80) ux -= 15;
  if (s.forms > 0 && s.inputsNoLabel > 0) ux -= 10;

  const security = sec?.score ?? clamp(100 - (!s.https ? 45 : 0) - (s.mixedContent > 0 ? 20 : 0));

  return {
    overall: clamp(seo * 0.15 + a11y * 0.15 + security * 0.2 + perf * 0.15 + bp * 0.15 + ux * 0.2),
    seo: clamp(seo), accessibility: clamp(a11y), security, performance: clamp(perf),
    bestPractices: clamp(bp), ux: clamp(ux),
  };
}

export function computeScoresWithLighthouse(s: SiteSignals, lh: PageSpeedResult, sec: SecurityResult | null): Scores {
  const base = computeScoresFromSignals(s, sec);
  // Blend Lighthouse scores (60%) with heuristic (40%) for more reliable results
  return {
    overall: clamp(Math.round(lh.performance * 0.25 + lh.accessibility * 0.15 + lh.seo * 0.15 + lh.bestPractices * 0.1 + base.security * 0.2 + base.ux * 0.15)),
    seo: clamp(Math.round(lh.seo * 0.7 + base.seo * 0.3)),
    accessibility: clamp(Math.round(lh.accessibility * 0.7 + base.accessibility * 0.3)),
    security: base.security,
    performance: lh.performance,
    bestPractices: clamp(Math.round(lh.bestPractices * 0.7 + base.bestPractices * 0.3)),
    ux: base.ux,
  };
}

/* ─── Heuristic findings ───────────────────────────────────────── */

function add(findings: Finding[], _n: number, agent: Finding["agent"], severity: Finding["severity"], title: string, detail: string, fix: string, ghQuery?: string) {
  // id derives from findings.length (monotonic within the call) rather than the
  // passed-in counter `_n`, which callers never capture — the old `f${++n}` gave
  // every finding added in the same section the SAME id (duplicate React keys).
  const f: Finding = { id: `f${findings.length}`, agent, severity, title, detail, fix };
  if (severity !== "pass" && ghQuery) f.ghQuery = ghQuery;
  if (severity !== "pass") f.prompt = buildCorrectivePrompt(f, "");
  findings.push(f);
  return findings.length;
}

export function HEURISTIC_FINDINGS(s: SiteSignals): Finding[] {
  const findings: Finding[] = [];
  let n = 0;
  const domain = "";

  // SEO
  if (!s.meta.title) add(findings, n, "recon", "critical", "No <title>", "SERP CTR will collapse.", "Add 40–60 char unique title.", "next-seo meta tags");
  else if (s.meta.title.length < 15) add(findings, n, "recon", "warning", `Thin title (${s.meta.title.length} chars)`, "Expand to 40–60 characters.", "seo title optimization");
  else add(findings, n, "recon", "pass", "Title present", `"${s.meta.title.slice(0, 80)}"`, "Keep unique per page.");
  n = findings.length;

  if (!s.meta.description) add(findings, n, "recon", "warning", "No meta description", "Google auto-generates weak snippets.", "Add 120–155 char description.", "meta description");
  else if (s.meta.description.length > 200) add(findings, n, "recon", "warning", "Description too long", "Trim to 120–155 chars.", "meta description");
  else add(findings, n, "recon", "pass", "Description in range", `${s.meta.description.length} chars.`, "");

  if (!s.hasCanonical) add(findings, n, "recon", "warning", "Missing canonical", "Duplicate URL variants split rankings.", 'Add <link rel="canonical">', "canonical url");
  if (s.hasRobotsNoindex) add(findings, n, "recon", "critical", "Page is noindex", "Search engines are told to exclude this page.", "Remove noindex unless intentional.");
  if (s.jsonLd === 0) add(findings, n, "recon", "info", "No structured data", "Add JSON-LD for rich results.", "schema.org json-ld");
  if (s.h1Count === 0) add(findings, n, "recon", "warning", "No H1", "Add exactly one H1.", "semantic html headings");
  else if (s.h1Count > 1) add(findings, n, "recon", "warning", `${s.h1Count} H1s`, "Demote to single H1.", "heading structure");

  n = findings.length;
  // A11y
  if (!s.hasViewport) add(findings, n, "compliance", "critical", "Missing viewport", "Mobile gets desktop zoom-out.", '<meta name="viewport" content="width=device-width, initial-scale=1">');
  else add(findings, n, "compliance", "pass", "Viewport configured", "Mobile viewport declared.", "");
  if (s.imgTotal > 0 && s.imgMissingAlt > 0) {
    const pct = Math.round((s.imgMissingAlt / s.imgTotal) * 100);
    add(findings, n, "compliance", pct > 50 ? "critical" : "warning", `${s.imgMissingAlt}/${s.imgTotal} images missing alt`, "WCAG 1.1.1 violation.", "Add descriptive alt text.", "eslint jsx-a11y");
  } else if (s.imgTotal > 0) add(findings, n, "compliance", "pass", "All images have alt", `${s.imgTotal} images covered.`, "");
  if (s.inputsNoLabel > 0) add(findings, n, "compliance", "warning", `${s.inputsNoLabel} unlabeled form fields`, "Screen reader inaccessible.", "Pair with <label> or aria-label.", "react accessible forms");
  n = findings.length;

  // Security
  if (!s.https) add(findings, n, "security", "critical", "Plain HTTP", "Traffic unencrypted.", "Provision TLS + force HTTPS.", "letsencrypt https");
  else add(findings, n, "security", "pass", "HTTPS active", "Transport encrypted.", "");
  n = findings.length;

  // Performance
  if (s.fetchMs > 3000) add(findings, n, "qa", "warning", `Slow TTFB (${(s.fetchMs / 1000).toFixed(1)}s)`, "Above 800ms feels sluggish.", "Add edge cache/CDN.", "cdn edge caching");
  else if (s.fetchMs > 1200) add(findings, n, "qa", "info", `Moderate TTFB (${(s.fetchMs / 1000).toFixed(1)}s)`, "Acceptable but above 800ms.", "Edge cache or prerender.", "next.js ISR");
  else add(findings, n, "qa", "pass", `Fast TTFB (${s.fetchMs}ms)`, "Good response time.", "");
  n = findings.length;

  if (s.sizeKb > 400) add(findings, n, "qa", "warning", `Heavy HTML (${s.sizeKb} KB)`, "Above 100KB delays paint.", "Prune inline payloads.", "html minifier");
  if (s.scripts > 25) add(findings, n, "qa", "warning", `${s.scripts} external scripts`, "Each is a blocking request.", "Defer non-critical scripts.", "script loader defer");
  if (s.loremHits > 0) add(findings, n, "qa", "critical", `Placeholder copy live (${s.loremHits}×)`, "Shipped lorem ipsum destroys credibility.", "Replace with real copy.", "content audit");
  if (s.duplicateIds > 0) add(findings, n, "qa", "warning", `${s.duplicateIds} duplicate DOM ids`, "Breaks JS and label association.", "Make ids unique.", "eslint no-duplicate-id");
  if (s.todoComments > 0) add(findings, n, "qa", "warning", `${s.todoComments} TODO/FIXME in HTML`, "Unresolved work leaked.", "Resolve or strip.", "lint todo comments");
  n = findings.length;

  // UX
  if (!s.landmarks?.nav) add(findings, n, "ux", "warning", "No <nav> element", "Users have no map.", "Add persistent navigation.", "responsive navigation");
  else add(findings, n, "ux", "pass", "Navigation present", "Semantic nav detected.", "");
  if (s.ctaCount === 0) add(findings, n, "ux", "warning", "No call-to-action detected", "Page doesn't ask for next step.", "Define primary CTA.", "cta conversion optimization");
  else add(findings, n, "ux", "pass", `${s.ctaCount} CTA(s)`, "Action language present.", "");
  if (s.wordCount < 80) add(findings, n, "ux", "warning", `Thin content (${s.wordCount} words)`, "Visitors can't understand the product.", "Add value-prop and proof.", "landing page copy framework");
  n = findings.length;

  // Compliance
  if (!s.hasPrivacyLink) add(findings, n, "compliance", "critical", "No privacy policy link", "GDPR/CCPA exposure.", "Publish and link privacy policy.", "privacy policy generator");
  if (!s.hasTermsLink) add(findings, n, "compliance", "info", "No terms-of-service", "Commercial exposure.", "Add terms of service.", "");
  n = findings.length;

  return findings;
}

/* ─── Corrective prompts ───────────────────────────────────────── */

const ROLE_MAP: Record<string, string> = {
  recon: "senior SEO engineer", market: "product strategist", idea: "startup advisor",
  business: "product strategist", gaps: "market researcher", ux: "senior product designer",
  compliance: "digital compliance consultant", security: "application security engineer",
  qa: "senior QA engineer", prompts: "prompt engineer",
};

export function buildCorrectivePrompt(f: Finding, domain: string): string {
  const role = ROLE_MAP[f.agent] ?? "senior web engineer";
  return [
    `You are a ${role} auditing "${domain || "this site"}".`,
    `ISSUE (${f.severity.toUpperCase()}): ${f.title}.`,
    `OBSERVATION: ${f.detail}`,
    `TASK: ${f.fix}`,
    `DELIVERABLES: 1) Exact code changes as diffs/snippets. 2) One-line verification step. 3) Regression risks.`,
    `CONSTRAINTS: No functionality removal. Minimal, dependency-free changes. Follow existing conventions.`,
  ].join("\n");
}

export function buildMegaPrompt(domain: string, findings: Finding[], scores: Scores): CorrectivePrompt[] {
  const actionable = findings.filter((f) => f.severity === "critical" || f.severity === "warning").slice(0, 8);
  const prompts: CorrectivePrompt[] = actionable.map((f, i) => ({
    id: `p${i + 1}`, title: f.title, target: `${ROLE_MAP[f.agent]} · ${f.severity}`,
    prompt: f.prompt ?? buildCorrectivePrompt(f, domain),
  }));
  if (actionable.length > 0) {
    prompts.unshift({
      id: "mega", title: "Full remediation mega-prompt",
      target: `All agents · ${actionable.length} issues`,
      prompt: [
        `You are a staff-level engineer auditing "${domain}".`,
        `SCORES: overall ${scores.overall}/100 — SEO ${scores.seo}, A11y ${scores.accessibility}, Security ${scores.security}, Perf ${scores.performance}, BP ${scores.bestPractices}, UX ${scores.ux}.`,
        ``, `REMEDIATE IN PRIORITY ORDER:`,
        ...actionable.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} — ${f.detail}. Fix: ${f.fix}`),
        ``, `DELIVERABLES: ordered PR plan, exact code changes, verification checklist per issue.`,
        `RULES: no functionality removal, no new deps unless justified, <400 lines/PR.`,
      ].join("\n"),
    });
  }
  return prompts;
}

/* ─── Design concepts ──────────────────────────────────────────── */

export function buildConcepts(s: SiteSignals): DesignConcept[] {
  const brand = (s.meta.title.split(/[|–—-]/)[0] || "Site").trim().slice(0, 28);
  const tag = (s.meta.description || s.h1Text || "A clearer way to say what you do.").slice(0, 96);
  const accent = s.brandColor ?? "#0E8A6D";
  return [
    { id: "c1", name: "Conversion Focus", style: "conversion",
      rationale: `Centered hero, single primary CTA, social proof strip. Applied to "${brand}" — ${tag}`,
      changes: ["Single primary CTA repeated above fold and at page end", "Proof bar (logos/metrics) under hero", "3-step value narrative instead of feature dump"],
      palette: { bg: "#FAFAF7", surface: "#FFFFFF", text: "#191B1F", accent, muted: "#6B7280" } },
    { id: "c2", name: "Editorial Premium", style: "editorial",
      rationale: `Asymmetric grid, generous whitespace, oversized type. Applied to "${brand}" — ${tag}`,
      changes: ["7/5 asymmetric hero grid with image right", "Display headline at 2.5× body size", "Muted paper palette — accent for actions only"],
      palette: { bg: "#F4F1EA", surface: "#FBF9F4", text: "#23201A", accent: "#8A5A2B", muted: "#7A746A" } },
    { id: "c3", name: "Bold Signal", style: "bold",
      rationale: `Dark surface, electric accent, brutalist frames. Applied to "${brand}" — ${tag}`,
      changes: ["Charcoal canvas with one electric accent", "Hard borders and offset shadows", "Monospace data accents for technical credibility"],
      palette: { bg: "#121417", surface: "#1A1D22", text: "#EDEBE4", accent: "#C8F169", muted: "#8B929D" } },
  ];
}
