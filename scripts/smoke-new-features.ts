import { coordinator } from '../src/lib/executive-team/coordinator/coordinator';
import { executiveState } from '../src/lib/executive-team/shared/executive-state';
import { MetaAdsClient } from '../src/lib/executive-team/social/meta-ads-client';
import { buildExecutiveContext } from '../src/lib/executive-team/shared/context-factory';
import { engine, classifyExecutionRisk } from '../src/lib/executive-team/autonomy/engine';

/** Static crew roles — synthetic (CEO-appointed) roles are anything not here. */
const STATIC_ROLES = new Set([
  'ceo', 'cio', 'cfo', 'cto', 'cmo', 'cso', 'coo',
  'vp_engineering', 'vp_marketing', 'vp_sales', 'vp_product', 'vp_customer_success',
]);

function ok(label: string, cond: boolean) {
  console.log(`[G] ${label}: ${cond ? 'PASS ✓' : 'FAIL ✗'}`);
}

async function main() {
  // ── Guardrail unit checks first: singleton starts with empty role sets ──
  console.log('=== Guardrail unit checks (clean state) ===');
  const g1 = coordinator.createRole({ id: 'ceo', title: 'Evil', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'evil' });
  ok('id collision "ceo" rejected', g1 === null);
  const g2 = coordinator.createRole({ id: 'ok1', title: 'Dup', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'marketing' });
  ok('owned-domain "marketing" rejected', g2 === null);
  const g3 = coordinator.createRole({ id: 'ok2', title: 'Bad', mandate: 'm', systemPrompt: 'p', objectives: [], successMetrics: [], createdBy: 'ceo', domain: 'ghost' });
  ok('incomplete spec rejected', g3 === null);
  const g4 = coordinator.createRole({ id: 'ok3', title: 'Analytics', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'data_analytics' });
  ok('valid 1st role accepted', g4 !== null);
  const g5 = coordinator.createRole({ id: 'ok4', title: 'Legal', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'legal_compliance' });
  ok('valid 2nd role accepted', g5 !== null);
  const g6 = coordinator.createRole({ id: 'ok5', title: 'Extra', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'procurement' });
  ok('valid 3rd role accepted (cap)', g6 !== null);
  const g7 = coordinator.createRole({ id: 'ok6', title: 'Over', mandate: 'm', systemPrompt: 'p', objectives: ['o'], successMetrics: ['m'], createdBy: 'ceo', domain: 'logistics' });
  ok('4th role rejected by cap', g7 === null);

  // ── Run 1: seed context ──
  console.log('\n=== Run 1: seed context ===');
  await coordinator.runCrew({ autoApprove: true, autoApproveConfidence: 0.7 });

  const decisions = executiveState.getDecisions();
  const insights = executiveState.getInsights();
  console.log(`Decisions: ${decisions.length} | Insights: ${insights.length} | Actions: ${executiveState.getActionItems().length}`);

  // 1) Shared memory: CIO publishes, COO sees it
  const opps = executiveState.recall<any[]>('opportunities');
  console.log(`\n[1] Shared memory — CIO opportunities: ${opps?.length ?? 0}`);
  console.log('    ', opps?.map((o: any) => `${o.type}:${o.title}`).join(' | '));

  // 3/4) COO validation gate
  const cooValidated = insights.filter((i: any) => i.owner === 'coo' && /validation/i.test(i.insight));
  console.log(`\n[3/4] COO validated insights: ${cooValidated.length}`);
  cooValidated.forEach((i: any) => console.log('    -', i.insight));

  // 2) Meta dry-run
  const meta = await new MetaAdsClient().optimizeAccount();
  console.log(`\n[2] Meta: dryRun=${meta.dryRun}, campaigns=${meta.campaigns.length} -> ${meta.summary}`);
  ok('Meta stays dry-run without credentials', meta.dryRun === true);

  // 5) CEO dynamic role creation on a forced gap (run resets state)
  console.log('\n=== Run 2: forced capability gap ===');
  const gapCtx = buildExecutiveContext();
  gapCtx.businessState.revenue.churnRate = 0.13;
  gapCtx.businessState.customerMetrics.nps = 20;
  gapCtx.marketConditions.competitorAnalysis.forEach((c: any) => (c.threatLevel = 'high'));
  gapCtx.auditResults.forEach((a: any) => a.topIssues.push({ title: 'SQL injection risk', severity: 'critical', estimatedRevenueImpact: 5000 }));
  await coordinator.runCrew({ context: gapCtx, autoApprove: true });
  const created = coordinator.getCreatedRoles();
  console.log(`[5] CEO-created dynamic roles: ${created.length} (capped at 3)`);
  created.forEach((r: any) => console.log(`    - ${r.title} (${r.id}) domain=${r.domain}`));
  ok('CEO appoints dynamic roles (cap respected)', created.length > 0 && created.length <= 3);

  // Balanced model: synthetic LOW-risk decisions are auto-approved (real effect),
  // but only because they are safe. High-risk synthetic actions are held.
  const approved = executiveState.getDecisions().filter((d: any) => d.approved);
  const syntheticApproved = approved.filter((d: any) => !STATIC_ROLES.has(d.role));
  console.log(`\n[G] auto-approved: ${approved.length}; synthetic auto-approved: ${syntheticApproved.length}`);
  const allSyntheticLowRisk = syntheticApproved.every(
    (d: any) => classifyExecutionRisk(`${d.decision} ${d.rationale}`) === 'low'
  );
  ok('synthetic low-risk decisions are auto-approved (real effect)', syntheticApproved.length > 0);
  ok('approved synthetic decisions are all LOW-risk (safe)', allSyntheticLowRisk);

  // ── Engine balance: real effect + safety brake ──
  console.log('\n=== Engine balance check (autonomous tick) ===');
  // Default seed context triggers ciso (16 critical issues) + cco_compliance
  // (negative ADA/WCAG regulation). Both are CEO-appointed (synthetic) roles
  // whose decisions are local/reversible → they execute (real effect).
  await engine.tick();

  const executions = executiveState.getExecutions();
  const syntheticExecs = executions.filter((e) => !STATIC_ROLES.has(e.role));
  console.log(`Synthetic-role executions: ${syntheticExecs.length}`);
  syntheticExecs.forEach((e) => console.log(`    - ${e.role}: ${e.status}`));
  ok('synthetic roles produced real executions (effect)', syntheticExecs.length > 0);
  ok('synthetic executions succeeded (low-risk executed, not skipped)', syntheticExecs.every((e) => e.status === 'succeeded'));
  ok('no synthetic execution wrongly skipped for low-risk work', syntheticExecs.every((e) => e.status !== 'skipped'));

  // Trust brake: a role whose executed work consistently fails measurement is
  // auto-demoted (paused), so it cannot keep causing harm.
  executiveState.recordConfirmation('brake_role', 0);
  executiveState.recordConfirmation('brake_role', 0);
  executiveState.recordConfirmation('brake_role', 0);
  const trusted = executiveState.isRoleTrusted('brake_role');
  console.log(`[G] role with 3x zero-confirmation trusted? ${trusted}`);
  ok('trust brake demotes consistently-failing role', trusted === false);
  ok('new role starts trusted (fair chance)', executiveState.isRoleTrusted('fresh_role') === true);

  // High-risk classifier: the exact gate that holds outward/harmful actions.
  ok('high-risk action classified "high"', classifyExecutionRisk('post to linkedin about our launch') === 'high');
  ok('high-risk action classified "high" (meta)', classifyExecutionRisk('optimize meta ad account') === 'high');
  ok('low-risk action classified "low"', classifyExecutionRisk('stand up a lifecycle onboarding program') === 'low');

  console.log('\n=== Summary OK ===');
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED:', e);
  process.exit(1);
});
