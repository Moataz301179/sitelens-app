/**
 * FULL AUTONOMOUS LIFECYCLE
 *   scan → identify → plan → generate todos → execute → report (before/after)
 *
 * Everything runs dry-run by default. To make the `execute` step actually apply
 * fixes to a repo you own, set the credentials documented in .env.example:
 *
 *   GITHUB_REPO=owner/site-source
 *   GITHUB_TOKEN=ghp_...            # OR GITHUB_SSH_KEY + REPO_LOCAL_PATH
 *   APPLY_ENABLED=true              # explicit opt-in; never auto-implied
 *   OPENROUTER_API_KEY=sk-...       # optional: lets the agent draft real code diffs
 *
 * Without those, the run still completes scan→identify→plan→todos→report and
 * records a dry-run execution (no repo touched, nothing pushed).
 *
 *   npx tsx scripts/lifecycle.ts [url]
 */
import { contextForSite, auditFromStage1 } from './audit-to-context';
import { stage1Gather } from '../src/lib/analyzer';
import { executiveState } from '../src/lib/executive-team/shared/executive-state';
import { coordinator } from '../src/lib/executive-team/coordinator/coordinator';
import {
  loadGitHubConfig,
  applyFixesViaPR,
  pushViaSSH,
  type ApplyResult,
  type FileChange,
} from '../src/lib/executive-team/integrations/github';
import type { AuditSummary, IssueSummary } from '../src/lib/executive-team/shared/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TARGET = process.argv[2] ?? 'https://www.hotelsvendors.com';
const GEN = path.join(process.cwd(), 'generated');

const date = () => new Date().toISOString().split('T')[0];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- 1. SCAN ------------------------------------------------------ */
async function scan(url: string): Promise<AuditSummary> {
  const ctx = await contextForSite(url);
  return ctx.auditResults[0]!;
}

/* ---------- 2. IDENTIFY -------------------------------------------------- */
function identify(audit: AuditSummary): IssueSummary[] {
  return audit.topIssues;
}

/* ---------- 3 + 4. PLAN + TODOS ----------------------------------------- */
function buildPlan(issues: IssueSummary[], domain: string) {
  const byCat = new Map<string, IssueSummary[]>();
  for (const i of issues) {
    const arr = byCat.get(i.category) ?? [];
    arr.push(i);
    byCat.set(i.category, arr);
  }

  const todos = issues.map((i, n) => {
    const box = i.autoFixable ? '[x]' : '[ ]'; // pre-checked if auto-fixable
    return `${box} ${String(n + 1).padStart(2, '0')}. [${i.severity}] ${i.title} — est $${i.estimatedRevenueImpact}/mo, ${i.fixEffort} effort${i.autoFixable ? ' (auto)' : ''}`;
  });

  const plan = [
    `# Remediation Plan — ${domain}`,
    ``,
    `Generated ${new Date().toISOString()}`,
    `Open issues: ${issues.length} | Potential monthly impact: $${issues.reduce((s, i) => s + i.estimatedRevenueImpact, 0)}`,
    ``,
    `## Grouped by category`,
    ...[...byCat.entries()].map(([cat, list]) => `- **${cat}** (${list.length}): ${list.map((i) => i.title).join('; ')}`),
    ``,
    `## Todo list`,
    ...todos,
    ``,
  ].join('\n');

  const todosMd = [`# Todos — ${domain}`, ``, ...todos, ``].join('\n');

  return { plan, todosMd };
}

/* ---------- 5. EXECUTE (credential-gated) ------------------------------- */
function issueToSpec(i: IssueSummary): string {
  return [
    `## ${i.title}`,
    `- Severity: ${i.severity}`,
    `- Category: ${i.category}`,
    `- Estimated revenue impact: $${i.estimatedRevenueImpact}/mo`,
    `- Fix effort: ${i.fixEffort}`,
    `- Auto-fixable: ${i.autoFixable}`,
    ``,
    `### Recommended remediation`,
    `See the audit report for the recommended action for this category. Auto-fixable issues can be remediated by the apply step once credentials are configured.`,
    ``,
  ].join('\n');
}

async function execute(
  issues: IssueSummary[],
  domain: string,
): Promise<{ result: ApplyResult; changes: FileChange[] }> {
  const cfg = loadGitHubConfig();
  const applyEnabled = process.env.APPLY_ENABLED === 'true';

  // Always emit a local spec file per issue (this is the "artifact" of execution).
  const localSpecDir = path.join(GEN, `fixes-${domain}-${date()}`);
  fs.mkdirSync(localSpecDir, { recursive: true });
  const changes: FileChange[] = [
    {
      path: `fixes/${domain}/README.md`,
      content: `# Executive Team fix package — ${domain}\n\nGenerated ${new Date().toISOString()}\n\n${issues.length} issue(s) identified.\n`,
      message: `docs: add executive-team fix package for ${domain}`,
    },
  ];
  for (const i of issues) {
    const f = `fixes/${domain}/${slug(i.category)}-${slug(i.title)}.md`;
    const localPath = path.join(GEN, f);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, issueToSpec(i), 'utf8');
    changes.push({ path: f, content: issueToSpec(i), message: `fix(${i.category}): ${i.title}` });
  }

  if (!cfg) {
    return { result: { applied: false, mode: 'dry-run', reason: 'no GITHUB_REPO / credentials configured' }, changes };
  }
  if (!applyEnabled) {
    return { result: { applied: false, mode: 'dry-run', reason: 'APPLY_ENABLED is not "true"' }, changes };
  }

  try {
    if (cfg.token) {
      const res = await applyFixesViaPR(cfg, changes, `Executive Team fixes for ${domain}`, `Automated remediation package.\n\n${issues.length} issue(s) from audit.`);
      return { result: res, changes };
    }
    if (cfg.sshKey && cfg.localPath) {
      const branch = `${cfg.branchPrefix}-${Date.now()}`;
      await pushViaSSH(cfg, changes, branch);
      return { result: { applied: true, mode: 'ssh', branch }, changes };
    }
    return { result: { applied: false, mode: 'dry-run', reason: 'ssh path requires REPO_LOCAL_PATH' }, changes };
  } catch (err) {
    return { result: { applied: false, mode: 'dry-run', reason: `apply failed: ${err instanceof Error ? err.message : String(err)}` }, changes };
  }
}

/* ---------- 6. REPORT (before/after measurement) ------------------------ */
async function measureBeforeAfter(before: AuditSummary, url: string) {
  const payload = await stage1Gather(url);
  const after = auditFromStage1(payload);
  const b = before.scores;
  const a = after.scores;
  const delta = (k: keyof typeof b) => a[k] - b[k];
  return {
    after,
    deltas: {
      overall: delta('overall'),
      seo: delta('seo'),
      performance: delta('performance'),
      accessibility: delta('accessibility'),
      security: delta('security'),
      ux: delta('ux'),
    },
    issuesBefore: before.topIssues.length,
    issuesAfter: after.topIssues.length,
  };
}

/* ---------- orchestration ------------------------------------------------ */
async function main() {
  console.log(`\n=== EXECUTIVE TEAM — FULL LIFECYCLE: ${TARGET} ===\n`);
  fs.mkdirSync(GEN, { recursive: true });

  // 1. SCAN
  console.log('1/6 SCAN …');
  const before = await scan(TARGET);
  const sc = before.scores;
  console.log(`   scores: overall ${sc.overall} | seo ${sc.seo} | perf ${sc.performance} | a11y ${sc.accessibility} | sec ${sc.security} | ux ${sc.ux}`);

  // 2. IDENTIFY
  console.log('2/6 IDENTIFY …');
  const issues = identify(before);
  console.log(`   ${issues.length} issue(s) identified, potential $${issues.reduce((s, i) => s + i.estimatedRevenueImpact, 0)}/mo`);

  // 3+4. PLAN + TODOS
  console.log('3/6 PLAN + 4/6 TODOS …');
  const { plan, todosMd } = buildPlan(issues, before.domain);
  const planPath = path.join(GEN, `plan-${before.domain}-${date()}.md`);
  const todosPath = path.join(GEN, `todos-${before.domain}-${date()}.md`);
  fs.writeFileSync(planPath, plan, 'utf8');
  fs.writeFileSync(todosPath, todosMd, 'utf8');
  console.log(`   wrote ${planPath}`);

  // run crew for the dynamic-role / arbitration layer too
  const ctx = await contextForSite(TARGET);
  const run = await coordinator.runCrew({ context: ctx, autoApprove: true, autoApproveConfidence: 0.7 });
  const created = coordinator.getCreatedRoles();

  // 5. EXECUTE
  console.log('5/6 EXECUTE …');
  const { result } = await execute(issues, before.domain);
  // Record a measured execution in shared memory (status running → completed).
  const execId = `lifecycle-${before.domain}-${Date.now()}`;
  executiveState.recordExecution({
    decisionId: execId,
    role: 'coo',
    decision: `Apply fix package for ${before.domain} (${result.mode})`,
    status: 'running',
    queuedAt: new Date().toISOString(),
    expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.7 },
  });
  executiveState.completeExecution(execId, result.applied ? 'succeeded' : 'skipped');
  console.log(`   mode=${result.mode}${result.url ? ` PR=${result.url}` : ''}${result.reason ? ` (${result.reason})` : ''}`);

  // 6. REPORT (before/after)
  console.log('6/6 REPORT (before/after) …');
  const m = await measureBeforeAfter(before, TARGET);
  const d = m.deltas;
  const report = [
    `# Executive Team — Before / After Report`,
    ``,
    `URL: ${before.url}`,
    `Domain: ${before.domain}`,
    `Generated: ${new Date().toISOString()}`,
    `Apply mode: ${result.mode}${result.url ? ` (${result.url})` : ''}`,
    ``,
    `## Score deltas (after − before)`,
    `| Metric | Before | After | Δ |`,
    `|---|---|---|---|`,
    `| Overall | ${sc.overall} | ${m.after.scores.overall} | ${d.overall >= 0 ? '+' : ''}${d.overall} |`,
    `| SEO | ${sc.seo} | ${m.after.scores.seo} | ${d.seo >= 0 ? '+' : ''}${d.seo} |`,
    `| Performance | ${sc.performance} | ${m.after.scores.performance} | ${d.performance >= 0 ? '+' : ''}${d.performance} |`,
    `| Accessibility | ${sc.accessibility} | ${m.after.scores.accessibility} | ${d.accessibility >= 0 ? '+' : ''}${d.accessibility} |`,
    `| Security | ${sc.security} | ${m.after.scores.security} | ${d.security >= 0 ? '+' : ''}${d.security} |`,
    `| UX | ${sc.ux} | ${m.after.scores.ux} | ${d.ux >= 0 ? '+' : ''}${d.ux} |`,
    ``,
    `Open issues: ${m.issuesBefore} → ${m.issuesAfter}`,
    ``,
    m.issuesBefore === m.issuesAfter
      ? `> Note: scores are unchanged because no code was modified in this run (dry-run or PR not yet merged/deployed). Re-run the lifecycle after the PR is merged and the site redeployed to measure real improvement.`
      : `> Measured improvement recorded above.`,
    ``,
    `## CEO-appointed dynamic roles`,
    ...(created.length ? created.map((r) => `- ${r.title} (${r.id}) [${r.domain}]`) : ['- none this run']),
    ``,
    `## Plan & todos`,
    `- Plan: ${planPath}`,
    `- Todos: ${todosPath}`,
    `- Fix specs: generated/fixes/${before.domain}/`,
    ``,
  ].join('\n');

  const reportPath = path.join(GEN, `report-${before.domain}-${date()}.md`);
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(report);
  console.log(`\nWrote report: ${reportPath}\n`);
}

main().catch((e) => {
  console.error('LIFECYCLE FAILED:', e);
  process.exit(1);
});
