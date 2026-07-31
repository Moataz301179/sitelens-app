/**
 * Bridge a real website audit (Stage 1 gather) into an ExecutiveContext so the
 * autonomous executive team can be pointed at a live site.
 *
 * We never fabricate audit findings — scores and issues are derived from the
 * real fetch + Lighthouse + security scan. Where Lighthouse is unavailable
 * (e.g. no PageSpeed reachability) we fall back to transparent heuristics so the
 * crew still has a complete picture.
 */
import { stage1Gather } from '../src/lib/analyzer';
import { buildExecutiveContext } from '../src/lib/executive-team/shared/context-factory';
import type { AuditSummary, ExecutiveContext, IssueSummary } from '../src/lib/executive-team/shared/types';
import type { Stage1Payload } from '../src/lib/schema';

type Sev = IssueSummary['severity'];
type Fix = IssueSummary['fixEffort'];

function issue(severity: Sev, category: string, title: string, est: number, fix: Fix, auto: boolean): IssueSummary {
  return { severity, category, title, estimatedRevenueImpact: est, fixEffort: fix, autoFixable: auto };
}

function accessibilityHeuristic(s: Stage1Payload['siteSignals']): number {
  let score = 100;
  if (s.imgMissingAlt > 0) score -= Math.min(40, (s.imgMissingAlt / Math.max(1, s.imgTotal)) * 60);
  if (!s.hasViewport) score -= 10;
  if (s.inputsNoLabel > 0) score -= 10;
  if (s.ariaCount === 0) score -= 5;
  return Math.max(0, Math.round(score));
}

function performanceHeuristic(s: Stage1Payload['siteSignals']): number {
  let score = 90;
  if (s.fetchMs > 1500) score -= 30;
  else if (s.fetchMs > 800) score -= 15;
  if (s.sizeKb > 3000) score -= 20;
  else if (s.sizeKb > 1500) score -= 10;
  return Math.max(0, Math.round(score));
}

function bestPracticesHeuristic(s: Stage1Payload['siteSignals'], sec: Stage1Payload['security']): number {
  let score = 92;
  if (!s.https) score -= 30;
  if (s.mixedContent > 0) score -= 15;
  if (s.duplicateIds > 0) score -= 10;
  if (s.todoComments > 0) score -= 8;
  if (s.inlineHandlers > 0) score -= 5;
  if (sec && sec.score < 50) score -= 10;
  return Math.max(0, Math.round(score));
}

function uxHeuristic(s: Stage1Payload['siteSignals']): number {
  let score = 55;
  if (s.headingOrderOk) score += 10;
  if (s.h1Count === 1) score += 10;
  else if (s.h1Count === 0) score -= 10;
  if (s.landmarks.nav) score += 6;
  if (s.landmarks.main) score += 6;
  if (s.landmarks.footer) score += 4;
  if (s.hasViewport) score += 4;
  if (s.ariaCount > 0) score += Math.min(5, s.ariaCount);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function auditFromStage1(p: Stage1Payload): AuditSummary {
  const s = p.siteSignals;
  const lh = p.lighthouse;
  const sec = p.security;

  const seo = lh?.seo ?? (s.meta.description ? 72 : 45);
  const accessibility = lh?.accessibility ?? accessibilityHeuristic(s);
  const performance = lh?.performance ?? performanceHeuristic(s);
  const bestPractices = lh?.bestPractices ?? bestPracticesHeuristic(s, sec);
  const security = sec?.score ?? (s.https ? 72 : 25);
  const ux = uxHeuristic(s);
  const overall = Math.round((seo + accessibility + performance + bestPractices + security + ux) / 6);

  const issues: IssueSummary[] = [];
  const recommended: string[] = [];

  if (!s.meta.title) {
    issues.push(issue('critical', 'seo', 'Missing <title> tag', 2000, 'low', true));
  }
  if (!s.meta.description) {
    issues.push(issue('warning', 'seo', 'Missing meta description', 1500, 'low', true));
    recommended.push('Add a compelling 150–160 char meta description.');
  }
  if (!s.https) {
    issues.push(issue('critical', 'security', 'Site not served over HTTPS', 3000, 'medium', false));
  }
  if (s.mixedContent > 0) {
    issues.push(issue('critical', 'security', `${s.mixedContent} mixed-content resource(s)`, 1500, 'medium', false));
  }
  if (s.imgMissingAlt > 0) {
    issues.push(issue('warning', 'accessibility', `${s.imgMissingAlt} of ${s.imgTotal} images missing alt text`, s.imgMissingAlt * 200, 'low', true));
    recommended.push('Add descriptive alt text to all images.');
  }
  if (!s.hasViewport) {
    issues.push(issue('warning', 'ux', 'Missing responsive viewport meta', 800, 'low', true));
  }
  if (!s.hasCanonical) {
    issues.push(issue('info', 'seo', 'No canonical link tag', 400, 'low', true));
  }
  if (s.duplicateIds > 0) {
    issues.push(issue('warning', 'ux', `${s.duplicateIds} duplicate element id(s)`, 300, 'low', false));
  }
  if (s.inputsNoLabel > 0) {
    issues.push(issue('warning', 'accessibility', `${s.inputsNoLabel} form input(s) without label`, 500, 'medium', false));
  }
  if (!s.headingOrderOk) {
    issues.push(issue('warning', 'ux', 'Heading levels skip a rank', 300, 'low', false));
  }
  if (lh && lh.performance < 50) {
    issues.push(issue('critical', 'performance', `Lighthouse performance ${lh.performance}/100`, 2500, 'high', false));
    recommended.push('Optimise render-blocking resources and TTFB.');
  }
  if (lh && lh.seo < 50) {
    issues.push(issue('warning', 'seo', `Lighthouse SEO ${lh.seo}/100`, 1200, 'medium', false));
  }
  if (lh && lh.accessibility < 50) {
    issues.push(issue('warning', 'accessibility', `Lighthouse accessibility ${lh.accessibility}/100`, 1000, 'medium', false));
  }
  if (sec) {
    const missing = sec.headers.filter((h) => !h.present).map((h) => h.name);
    if (missing.length) issues.push(issue('warning', 'security', `Missing security header(s): ${missing.join(', ')}`, 1500, 'medium', false));
    if (sec.vulnerabilities.length) issues.push(issue('critical', 'security', `${sec.vulnerabilities.length} known vulnerabilit${sec.vulnerabilities.length === 1 ? 'y' : 'ies'} detected`, 4000, 'high', false));
    if (sec.score < 50) issues.push(issue('critical', 'security', `Security score ${sec.score}/100`, 3000, 'high', false));
  }
  if (s.cookieMention && !s.hasPrivacyLink) {
    issues.push(issue('warning', 'compliance', 'Uses cookies but no privacy-policy link', 600, 'low', true));
  }

  const potential = issues.reduce((sum, i) => sum + i.estimatedRevenueImpact, 0);

  return {
    id: `audit-${p.domain}-${Date.now()}`,
    url: p.finalUrl,
    domain: p.domain,
    scores: { overall, seo, accessibility, security, performance, bestPractices, ux },
    topIssues: issues.slice(0, 12),
    potentialRevenueImpact: potential,
    recommendedActions: recommended.length ? recommended : ['Run a full remediation pass on detected issues.'],
    completedAt: p.fetchedAt,
  };
}

export async function contextForSite(url: string): Promise<ExecutiveContext> {
  const payload = await stage1Gather(url);
  const audit = auditFromStage1(payload);
  const ctx = buildExecutiveContext({ targetUrl: payload.finalUrl });
  // Replace the synthetic seed audits with the real one we just gathered.
  ctx.auditResults = [audit];
  return ctx;
}
