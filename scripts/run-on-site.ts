/**
 * Point the autonomous Executive Team at a LIVE website and run a full cycle:
 * real audit → crew analysis → CEO arbitration/auto-approval → execution →
 * measured effect. All outward actions stay dry-run (no credentials required).
 *
 *   npx tsx scripts/run-on-site.ts [url]
 */
import { engine } from '../src/lib/executive-team/autonomy/engine';
import { coordinator } from '../src/lib/executive-team/coordinator/coordinator';
import { executiveState } from '../src/lib/executive-team/shared/executive-state';
import { contextForSite } from './audit-to-context';
import * as fs from 'node:fs';
import * as path from 'node:path';

const STATIC = new Set(['ceo', 'cio', 'cfo', 'cto', 'cmo', 'cso', 'coo']);
const TARGET = process.argv[2] ?? 'https://www.hotelsvendors.com';

async function main() {
  console.log(`\n=== Executive Team — live audit of ${TARGET} ===\n`);

  const ctx = await contextForSite(TARGET);
  const audit = ctx.auditResults[0]!;
  const sc = audit.scores;
  console.log(`Audited ${audit.domain} (${audit.url}) — status ${ctx.auditResults[0] ? 'ok' : 'n/a'}`);
  console.log(`Scores: overall ${sc.overall} | seo ${sc.seo} | perf ${sc.performance} | a11y ${sc.accessibility} | sec ${sc.security} | ux ${sc.ux}`);
  console.log(`\nTop issues (${audit.topIssues.length}):`);
  audit.topIssues.forEach((i) => console.log(`  - [${i.severity}] ${i.title}  (~$${i.estimatedRevenueImpact}/mo, ${i.fixEffort})`));

  const run = await engine.runContext(ctx, { autoApprove: true, autoApproveConfidence: 0.7 });

  console.log(`\n=== Crew run ${run.id} ===\n`);
  console.log(run.summary);

  const approved = run.decisions.filter((d) => d.approved);
  console.log(`\nDecisions: ${run.decisions.length} total, ${approved.length} auto-approved`);
  console.log(`Insights: ${run.insights.length} | Action items: ${run.actionItems.length}`);

  const created = coordinator.getCreatedRoles();
  if (created.length) {
    console.log(`\nCEO-appointed dynamic roles (${created.length}, capped at 3):`);
    created.forEach((r) => console.log(`  - ${r.title} (${r.id}) [domain: ${r.domain}]`));
  }

  const execs = executiveState.getExecutions();
  const synthExecs = execs.filter((e) => !STATIC.has(e.role));
  console.log(`\nExecutions: ${execs.length} total; synthetic-role executions: ${synthExecs.length}`);
  execs.slice(-14).forEach((e) => {
    const conf = e.confirmation != null ? ` (confirmation ${Math.round(e.confirmation * 100)}%)` : '';
    console.log(`  - [${e.role}] ${e.status} — ${e.decision}${conf}`);
  });

  const held = execs.filter((e) => e.status === 'skipped');
  if (held.length) console.log(`\n${held.length} high-risk action(s) held for human approval (trust/risk gate).`);

  const out = path.join(process.cwd(), 'generated', `live-audit-${audit.domain}-${new Date().toISOString().split('T')[0]}.md`);
  const md = [
    `# Executive Team — Live Audit Report`,
    ``,
    `URL: ${audit.url}`,
    `Domain: ${audit.domain}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Site scores`,
    `- Overall: ${sc.overall}`,
    `- SEO: ${sc.seo}`,
    `- Performance: ${sc.performance}`,
    `- Accessibility: ${sc.accessibility}`,
    `- Security: ${sc.security}`,
    `- UX: ${sc.ux}`,
    ``,
    `## Top issues`,
    ...audit.topIssues.map((i) => `- [${i.severity}] ${i.title} (~$${i.estimatedRevenueImpact}/mo, ${i.fixEffort} effort, autoFixable=${i.autoFixable})`),
    ``,
    `## CEO-appointed dynamic roles`,
    ...(created.length ? created.map((r) => `- ${r.title} (${r.id}) [${r.domain}]`) : ['- none this run']),
    ``,
    `## Crew summary`,
    run.summary,
    ``,
    `## Executions`,
    ...execs.map((e) => `- [${e.role}] ${e.status} — ${e.decision}`),
    ``,
  ].join('\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md, 'utf8');
  console.log(`\nWrote report: ${out}\n`);
}

main().catch((e) => {
  console.error('RUN FAILED:', e);
  process.exit(1);
});
