/**
 * Software Engineer Agent — the crew's EXECUTION ARM.
 *
 * The other executives (CTO, COO, …) decide WHAT to do. This agent is the one
 * that actually turns an approved decision into CODE: it drafts a concrete fix
 * spec (optionally with real code snippets from an LLM) and opens a GitHub Pull
 * Request through the existing, credential-gated apply channel.
 *
 * Safety model (inherits the team's guardrails):
 *  - Dry-run by default. It only opens a PR when GITHUB_REPO + a token (or SSH
 *    key) are configured AND APPLY_ENABLED === 'true'. Otherwise it writes a
 *    local spec and reports a dry-run.
 *  - PR-only. It never force-pushes main, never deletes anything, never deploys.
 *    A human reviews & merges the PR.
 *  - Reversible. Opening a branch/PR is a low-risk, fully reversible action.
 *  - No secrets are read or logged here; credentials come from the environment
 *    via loadGitHubConfig().
 *
 * NOTE: this agent is NOT in CREW_ORDER — it does not participate in the
 * strategy/decision loop. The AutonomousEngine routes approved *code-worthy*
 * decisions to it after the crew has made them.
 */

import { BaseExecutiveAgent, ExecutiveAnalysis } from '../shared/base-agent';
import {
  ExecutiveContext,
  ExecutiveDecision,
  StrategicInsight,
  ActionItem,
  ExpectedImpact,
} from '../shared/types';
import { executiveState } from '../shared/executive-state';
import { complete } from '@/lib/llm';
import {
  loadGitHubConfig,
  applyFixesViaPR,
  pushViaSSH,
  type ApplyResult,
  type FileChange,
  type GitHubConfig,
} from '../integrations/github';
import { codebaseLedger, type PatternEntry } from '../knowledge/codebase-ledger';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ApplyMode = 'pr' | 'ssh' | 'dry-run' | 'skipped';

export interface ImplementationResult {
  mode: ApplyMode;
  title: string;
  prUrl?: string;
  prNumber?: number;
  branch?: string;
  files: string[];
  notes: string;
}

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export class SWEAgent extends BaseExecutiveAgent {
  constructor() {
    super('swe');
  }

  protected getSystemPrompt(): string {
    return `You are the Software Engineer of an autonomous executive team for an AI website-audit platform. You are the EXECUTION ARM: you take approved executive decisions and turn them into concrete, reviewable code changes.

HOW YOU WORK:
- You receive a decision (what to build/fix) plus the live audit context (issues, scores, target URL).
- You produce a precise implementation spec. When an LLM key is available you ALSO draft concrete, production-ready code snippets with explicit file paths.
- You never invent credentials, never touch production directly, and never force-push. You open a Pull Request and let a human merge.
- If you do not know the repo's exact file structure, you output a clear spec with code blocks a human (or CI) can apply.

PRINCIPLES:
- Small, reviewable, reversible changes over big risky ones.
- Prefer fixing root causes (missing meta tags, security headers, performance bottlenecks) with measurable impact.
- Never fabricate results. State clearly what is heuristic vs. verified.`;
  }

  // ── Required abstract overrides (executor only; never invoked by crew loop) ──
  async analyze(_ctx: ExecutiveContext): Promise<ExecutiveAnalysis> {
    return {
      role: 'swe',
      timestamp: new Date().toISOString(),
      businessAssessment: { healthScore: 0, strengths: [], weaknesses: [], opportunities: [], threats: [], keyMetrics: {} },
      marketAssessment: { attractiveness: 0, competitivePosition: 0, trends: [], threats: [], opportunities: [] },
      initiativeAssessment: { onTrack: [], atRisk: [], behind: [], completed: [], recommendedChanges: [] },
      resourceAssessment: { budgetHealth: 'healthy', personnelHealth: 'healthy', technologyHealth: 'healthy', recommendations: [] },
      recommendations: [],
      confidence: 0,
    };
  }
  async makeDecisions(_analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> { return []; }
  async generateInsights(_analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> { return []; }
  async createActionItems(_analysis: ExecutiveAnalysis): Promise<ActionItem[]> { return []; }

  // ── Core: implement an approved decision into a code change ──────────────────
  async implementDecision(
    decision: ExecutiveDecision,
    ctx: ExecutiveContext,
    githubOverrides?: Partial<GitHubConfig>,
  ): Promise<ImplementationResult> {
    const cfg = loadGitHubConfig(githubOverrides);
    // A repo + token supplied directly through the "apply fixes" UI is the user's
    // explicit per-request enablement; the env-only path still needs APPLY_ENABLED.
    const applyEnabled = githubOverrides?.token ? true : process.env.APPLY_ENABLED === 'true';
    const applyKey = process.env.OPENROUTER_API_KEY || '';
    const domain = ctx.auditResults[0]?.domain ?? 'site';
    const title = `Executive Team: ${decision.decision.slice(0, 80)}`;

    const issues = ctx.auditResults
      .flatMap((a) => a.topIssues)
      .filter((i) => i.severity !== 'info');

    // ── Consult the accumulated ledger: derive concerns, skip already-handled
    // ones (idempotency) and avoid conflicting with open PRs. ──
    const concerns = issues.length
      ? issues.map((i) => ({ category: i.category, concern: slug(i.title), title: i.title }))
      : [{ category: 'general', concern: slug(decision.decision), title: decision.decision }];

    const actionable: typeof concerns = [];
    const skipped: string[] = [];
    for (const c of concerns) {
      if (codebaseLedger.isAlreadyHandled(domain, c.category, c.concern)) {
        skipped.push(`${c.category}: ${c.title} (already refined)`);
        continue;
      }
      if (codebaseLedger.isConflicting(domain, c.category, c.concern, decision.id)) {
        skipped.push(`${c.category}: ${c.title} (conflict — in-flight PR)`);
        continue;
      }
      codebaseLedger.open(domain, c.category, c.concern, c.title, decision.id);
      actionable.push(c);
    }

    // Reuse learned "how & where" so we don't re-derive from scratch each run.
    const patterns: PatternEntry[] = actionable
      .map((c) => codebaseLedger.findPattern(c.category, c.concern))
      .filter((p): p is PatternEntry => !!p);

    const spec = await this.buildSpec(decision, ctx, issues, applyKey, actionable, skipped, patterns);

    const filePath = `exec-team/${domain}/${slug(decision.decision)}.md`;
    const changes: FileChange[] = [
      { path: filePath, content: spec, message: `fix(ai-team): ${slug(decision.decision)}` },
    ];

    // Always persist a local artifact (the "proof of work") regardless of channel.
    const genDir = path.join(process.cwd(), 'generated', 'swe');
    fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(path.join(genDir, `${slug(decision.decision)}.md`), spec, 'utf8');

    // If everything was already handled, don't open a redundant PR.
    if (actionable.length === 0) {
      return { mode: 'skipped', title, files: [filePath], notes: `No new concerns — ${skipped.join('; ') || 'all refined'}` };
    }

    if (!cfg) {
      this.finalizeLedger(domain, decision.id, actionable, 'planned', undefined);
      return { mode: 'dry-run', title, files: [filePath], notes: 'No GITHUB_REPO/credentials — wrote local spec only.' };
    }
    if (!applyEnabled) {
      this.finalizeLedger(domain, decision.id, actionable, 'planned', undefined);
      return { mode: 'dry-run', title, files: [filePath], notes: 'APPLY_ENABLED is not "true" — wrote local spec only.' };
    }

    const body =
      `Automated fix drafted by the Software Engineer agent.\n\n` +
      `Decision: ${decision.decision}\nOwner role: ${decision.role}\n\n` +
      `Review the included spec and apply the changes, then merge. This PR was generated by the SiteLens autonomous crew.`;

    try {
      if (cfg.token) {
        const res: ApplyResult = await applyFixesViaPR(cfg, changes, title, body);
        if (res.applied && res.url) {
          this.finalizeLedger(domain, decision.id, actionable, 'refurbished', res.url);
          return { mode: 'pr', title, prUrl: res.url, prNumber: res.prNumber, branch: res.branch, files: [filePath], notes: `Opened PR #${res.prNumber}` };
        }
        this.finalizeLedger(domain, decision.id, actionable, 'planned', undefined);
        return { mode: 'dry-run', title, files: [filePath], notes: `Apply returned no PR: ${res.reason ?? 'unknown'}` };
      }
      if (cfg.sshKey && cfg.localPath) {
        const branch = `${cfg.branchPrefix}-${Date.now()}`;
        await pushViaSSH(cfg, changes, branch);
        this.finalizeLedger(domain, decision.id, actionable, 'refurbished', undefined);
        return { mode: 'ssh', title, branch, files: [filePath], notes: `Pushed branch ${branch}` };
      }
      this.finalizeLedger(domain, decision.id, actionable, 'planned', undefined);
      return { mode: 'dry-run', title, files: [filePath], notes: 'SSH apply requires REPO_LOCAL_PATH + GITHUB_SSH_KEY' };
    } catch (err) {
      this.finalizeLedger(domain, decision.id, actionable, 'planned', undefined);
      return { mode: 'dry-run', title, files: [filePath], notes: `Apply failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Record each opened concern in the ledger and publish a light summary to the awareness brain. */
  private finalizeLedger(
    domain: string,
    decisionId: string,
    actionable: { category: string; concern: string; title: string }[],
    status: 'planned' | 'refurbished' | 'refined' | 'merged' | 'failed',
    prUrl?: string,
  ): void {
    for (const c of actionable) {
      codebaseLedger.complete(domain, c.category, c.concern, c.title, decisionId, {
        status,
        approach: status === 'refurbished'
          ? `Opened fix PR${prUrl ? ` (${prUrl})` : ''} with refinement spec for ${c.title}.`
          : `Drafted refinement spec for ${c.title} (pending apply).`,
        prUrl,
      });
    }
    // Keep the strategic awareness layer informed WITHOUT duplicating the data.
    executiveState.remember('ledger.summary', codebaseLedger.counts);
  }

  /** Convenience for a manual "apply fixes for this site" trigger: one PR per site. */
  async applySite(ctx: ExecutiveContext, githubOverrides?: Partial<GitHubConfig>): Promise<ImplementationResult> {
    const domain = ctx.auditResults[0]?.domain ?? 'site';
    const potential = ctx.auditResults.reduce((s, a) => s + a.potentialRevenueImpact, 0);
    const decision: ExecutiveDecision = {
      id: `swe-site-${domain}-${Date.now()}`,
      role: 'cto',
      decision: `Fix audit issues for ${domain}`,
      rationale: `Audit found remediable issues with an estimated $${potential}/mo revenue impact.`,
      expectedOutcome: { revenueIncrease: potential, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.7 },
      riskAssessment: { level: 'low', risks: [], mitigationStrategies: [], contingencyPlans: [] },
      alternatives: [],
      approved: true,
    };
    return this.implementDecision(decision, ctx, githubOverrides);
  }

  // ── Spec builder ────────────────────────────────────────────────────────────
  private async buildSpec(
    decision: ExecutiveDecision,
    ctx: ExecutiveContext,
    issues: { severity: string; category: string; title: string; estimatedRevenueImpact: number; fixEffort: string; autoFixable: boolean }[],
    applyKey: string,
    actionable: { category: string; concern: string; title: string }[],
    skipped: string[],
    patterns: PatternEntry[],
  ): Promise<string> {
    const header = [
      `# Implementation spec — ${decision.decision}`,
      ``,
      `> Decision owner: ${decision.role}`,
      `> Rationale: ${decision.rationale}`,
      `> Expected outcome: revenue +$${decision.expectedOutcome.revenueIncrease}, confidence ${Math.round(decision.expectedOutcome.confidence * 100)}%`,
      `> Target: ${ctx.auditResults[0]?.url ?? 'the website'}`,
      `> Generated: ${new Date().toISOString()}`,
      ``,
    ].join('\n');

    let body = '';
    if (issues.length) {
      body += `## Audit issues this addresses\n`;
      body += issues
        .slice(0, 12)
        .map((i) => `- [${i.severity}] ${i.title} (${i.category}) — est $${i.estimatedRevenueImpact}/mo, effort ${i.fixEffort}${i.autoFixable ? ' (auto-fixable)' : ''}`)
        .join('\n');
      body += `\n\n`;
    } else {
      body += `## Audit issues\n- No specific issues captured; applying the decision as a general improvement.\n\n`;
    }

    // Surface reused "how & where" knowledge so the spec builds on prior work.
    if (patterns.length) {
      body += `## Previously learned approach (reused from the refinement library)\n`;
      for (const p of patterns) {
        body += `- **[${p.category}] ${p.concern}**: ${p.how}${p.where.length ? ` → ${p.where.join(', ')}` : ''}\n`;
      }
      body += `\n`;
    }

    if (skipped.length) {
      body += `## Already refined this cycle (skipped — idempotent)\n`;
      body += skipped.map((s) => `- ${s}`).join('\n') + `\n\n`;
    }

    if (applyKey) {
      try {
        const code = await complete({
          provider: 'openrouter',
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
          apiKey: applyKey,
          messages: [
            {
              role: 'system',
              content:
                this.getSystemPrompt() +
                '\n\nYou produce concrete, production-ready code patches with explicit file paths. When you do not know the exact repo structure, output a clear spec with code blocks a human can apply. Return markdown only.',
            },
            {
              role: 'user',
              content:
                `Decision: ${decision.decision}\nRationale: ${decision.rationale}\nTarget: ${ctx.auditResults[0]?.url ?? 'the website'}\n` +
                `Known issues:\n${issues.map((i) => `- ${i.title} (${i.category}, ${i.severity})`).join('\n')}\n\n` +
                `Produce a fix spec with concrete code snippets.`,
            },
          ],
          maxTokens: 1500,
          temperature: 0.2,
        });
        body += `## Proposed changes (drafted by Software Engineer agent)\n\n${code}\n`;
      } catch (e) {
        body += `_Code drafting unavailable (${e instanceof Error ? e.message : 'llm error'}). Spec above is heuristic._\n\n`;
      }
    } else {
      body += `_Set OPENROUTER_API_KEY to have the agent draft concrete code diffs. Showing heuristic spec above._\n\n`;
    }

    body += `## Acceptance criteria\n- [ ] Change addresses the decision\n- [ ] Audit score for the affected category improves\n- [ ] No regressions in other categories\n`;
    return header + body;
  }
}

/** Singleton used by the AutonomousEngine (the execution flow owns the agent). */
export const softwareEngineer = new SWEAgent();
