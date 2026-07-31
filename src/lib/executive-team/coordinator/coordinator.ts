/**
 * Executive Coordinator — the orchestration "brain" that runs the whole crew.
 *
 * Responsibilities:
 *  - Build & broadcast a shared ExecutiveContext to every agent
 *  - Run each agent (analyze → decide → insight → actions) in a synchronized loop
 *  - Collect cross-agent communications, decisions, insights, action items
 *  - Let the CEO arbitrate priorities and approve high-confidence decisions
 *  - Persist a CrewRun and return a human-readable summary
 *
 * Designed to be resilient: if an agent (or its LLM call) fails, the crew
 * continues and reports partial results instead of crashing.
 */

import { CEOAgent } from '../ceo/ceo-agent';
import { COOAgent } from '../coo/coo-agent';
import { CTOAgent } from '../cto/cto-agent';
import { CFOAgent } from '../cfo/cfo-agent';
import { CMOAgent } from '../cmo/cmo-agent';
import { CROAgent } from '../cro/cro-agent';
import { CIOAgent } from '../cio/cio-agent';
import { SyntheticAgent } from '../shared/synthetic-agent';
import { SWEAgent } from '../swe/swe-agent';
import { BaseExecutiveAgent, ExecutiveAnalysis } from '../shared/base-agent';
import { ExecutiveContext, ExecutiveRole, RoleSpec } from '../shared/types';
import { executiveState, CrewRun } from '../shared/executive-state';
import { buildExecutiveContext, ContextSeed } from '../shared/context-factory';

export interface CrewRunOptions {
  seed?: ContextSeed;
  context?: ExecutiveContext;
  autoApprove?: boolean; // autonomous mode: approve decisions above confidence
  autoApproveConfidence?: number;
}

const AGENT_REGISTRY: Record<ExecutiveRole, () => BaseExecutiveAgent> = {
  ceo: () => new CEOAgent(),
  coo: () => new COOAgent(),
  cto: () => new CTOAgent(),
  cfo: () => new CFOAgent(),
  cmo: () => new CMOAgent(),
  cso: () => new CROAgent(),
  cio: () => new CIOAgent(),
  vp_engineering: () => new CTOAgent(),
  vp_marketing: () => new CMOAgent(),
  vp_sales: () => new CROAgent(),
  vp_product: () => new CEOAgent(),
  vp_customer_success: () => new COOAgent(),
  swe: () => new SWEAgent(),
};

// The Intelligence Officer runs early so its opportunity radar is published to
// the shared brain before the COO/CMO/CFO consume it.
const CREW_ORDER: ExecutiveRole[] = ['ceo', 'cio', 'cfo', 'cto', 'cmo', 'cso', 'coo'];

function emptyAnalysis(role: ExecutiveRole): ExecutiveAnalysis {
  return {
    role,
    timestamp: new Date().toISOString(),
    businessAssessment: { healthScore: 0, strengths: [], weaknesses: [], opportunities: [], threats: [], keyMetrics: {} },
    marketAssessment: { attractiveness: 0, competitivePosition: 0, trends: [], threats: [], opportunities: [] },
    initiativeAssessment: { onTrack: [], atRisk: [], behind: [], completed: [], recommendedChanges: [] },
    resourceAssessment: { budgetHealth: 'critical', personnelHealth: 'stretched', technologyHealth: 'needs_investment', recommendations: [] },
    recommendations: [],
    confidence: 0,
  };
}

export class ExecutiveCoordinator {
  private agents = new Map<ExecutiveRole, BaseExecutiveAgent>();
  private dynamicAgents = new Map<string, BaseExecutiveAgent>();
  private createdRoles: RoleSpec[] = [];

  // ── Guardrails for CEO-appointed dynamic roles ──────────────────────────
  /** Static crew roles — synthetic roles may never collide with these. */
  private staticRoles = new Set<ExecutiveRole>(Object.keys(AGENT_REGISTRY) as ExecutiveRole[]);
  /** Domains already owned by the static crew — never spawn a duplicate owner. */
  private ownedDomains = new Set<string>([
    'strategy', 'finance', 'technology', 'operations', 'marketing', 'sales', 'intelligence',
  ]);
  /** Ids already created this process — prevents duplicate role instances. */
  private createdRoleIds = new Set<string>();
  /** Domains already created this process — prevents two roles owning one scope. */
  private createdDomains = new Set<string>();
  /** Hard cap on how many roles the CEO may appoint per crew run. */
  private readonly MAX_DYNAMIC_ROLES_PER_RUN = 3;

  private getAgent(role: ExecutiveRole): BaseExecutiveAgent {
    if (!this.agents.has(role)) {
      this.agents.set(role, AGENT_REGISTRY[role]());
    }
    return this.agents.get(role)!;
  }

  /**
   * CEO-appointed new role. Applies guardrails, then instantiates a
   * SyntheticAgent from a RoleSpec and registers it so it participates in the
   * crew and shares the brain like any other executive.
   *
   * Guardrails (prevent code conflicts & hallucination):
   *  - hard per-run cap on number of roles created
   *  - id sanitized to [a-z0-9_]+ and rejected on collision with a static or
   *    already-created role
   *  - domain rejected if already owned by the static crew or already created
   *  - spec must be complete (title/mandate/prompt/objectives/metrics)
   * Returns null (and logs) when a guardrail blocks creation.
   */
  createRole(spec: RoleSpec): BaseExecutiveAgent | null {
    if (this.createdRoleIds.size >= this.MAX_DYNAMIC_ROLES_PER_RUN) {
      console.log(`[coordinator] role cap (${this.MAX_DYNAMIC_ROLES_PER_RUN}) reached — skipping "${spec.title}"`);
      return null;
    }

    const id = (spec.id || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (!id) {
      console.log('[coordinator] rejected role: empty/invalid id');
      return null;
    }
    if (this.staticRoles.has(id as ExecutiveRole) || this.createdRoleIds.has(id)) {
      console.log(`[coordinator] rejected role "${id}": id collision`);
      return null;
    }
    if (this.ownedDomains.has(spec.domain) || this.createdDomains.has(spec.domain)) {
      console.log(`[coordinator] rejected role "${id}": domain "${spec.domain}" already covered`);
      return null;
    }
    if (
      !spec.title ||
      !spec.mandate ||
      !spec.systemPrompt ||
      !Array.isArray(spec.objectives) ||
      spec.objectives.length === 0 ||
      !Array.isArray(spec.successMetrics) ||
      spec.successMetrics.length === 0
    ) {
      console.log(`[coordinator] rejected role "${id}": incomplete RoleSpec`);
      return null;
    }

    const cleanSpec: RoleSpec = { ...spec, id };
    const agent = new SyntheticAgent(cleanSpec);
    this.dynamicAgents.set(id, agent);
    this.createdRoleIds.add(id);
    this.createdDomains.add(spec.domain);
    this.createdRoles.push(cleanSpec);
    executiveState.remember(`role.${id}`, cleanSpec);
    return agent;
  }

  getCreatedRoles(): RoleSpec[] {
    return [...this.createdRoles];
  }

  async runCrew(options: CrewRunOptions = {}): Promise<CrewRun> {
    const context = options.context ?? buildExecutiveContext(options.seed);
    executiveState.setContext(context);
    executiveState.resetCycle();
    this.createdRoles = [];
    this.createdRoleIds.clear();
    this.createdDomains.clear();

    // Baseline metrics snapshot for effect measurement
    executiveState.snapshot({
      mrr: context.businessState.revenue.monthlyRecurring,
      activeCustomers: context.businessState.customerMetrics.activeCustomers,
      pipelineWeighted: 180000,
      cac: context.businessState.costs.cac,
      nps: context.businessState.customerMetrics.nps,
      auditVolume: context.auditResults.length * 12,
      systemUptime: 0.999,
      openIssues: context.auditResults.reduce((n, a) => n + a.topIssues.filter((i) => i.severity === 'critical').length, 0),
    });

    const analyses = new Map<ExecutiveRole, ExecutiveAnalysis>();
    const decisions = [] as Awaited<ReturnType<BaseExecutiveAgent['makeDecisions']>>;
    const insights = [] as Awaited<ReturnType<BaseExecutiveAgent['generateInsights']>>;
    const actionItems = [] as Awaited<ReturnType<BaseExecutiveAgent['createActionItems']>>;

    for (const role of CREW_ORDER) {
      const agent = this.getAgent(role);
      try {
        agent.setContext(context);
        agent.syncMemory(); // pick up anything other agents published so far
        const analysis = await agent.analyze(context);
        analyses.set(role, analysis);
        executiveState.remember(`analysis.${role}`, analysis);

        const [d, i, a] = await Promise.all([
          agent.makeDecisions(analysis),
          agent.generateInsights(analysis),
          agent.createActionItems(analysis),
        ]);
        d.forEach((x) => executiveState.recordDecision(x));
        i.forEach((x) => executiveState.recordInsight(x));
        a.forEach((x) => executiveState.recordActionItem(x));
        decisions.push(...d);
        insights.push(...i);
        actionItems.push(...a);
      } catch (err) {
        console.error(`[coordinator] agent ${role} failed:`, err);
        analyses.set(role, emptyAnalysis(role));
      }
    }

    // CEO-appointed dynamic roles: detect capability gaps and spin up new agents
    // to cover missing scope, then run them as part of the same crew.
    const ceoAnalysis = analyses.get('ceo');
    if (ceoAnalysis) {
      try {
        const gapSpecs = (this.getAgent('ceo') as CEOAgent).proposeNewRoles(context);
        for (const spec of gapSpecs) {
          const agent = this.createRole(spec);
          if (!agent) continue; // guardrail blocked creation
          try {
            agent.setContext(context);
            agent.syncMemory();
            const dAnalysis = await agent.analyze(context);
            const [d, i, a] = await Promise.all([
              agent.makeDecisions(dAnalysis),
              agent.generateInsights(dAnalysis),
              agent.createActionItems(dAnalysis),
            ]);
            d.forEach((x) => executiveState.recordDecision(x));
            i.forEach((x) => executiveState.recordInsight(x));
            a.forEach((x) => executiveState.recordActionItem(x));
            decisions.push(...d);
            insights.push(...i);
            actionItems.push(...a);
            console.log(`[coordinator] CEO appointed new role: ${spec.title} (${spec.id})`);
          } catch (err) {
            console.error(`[coordinator] dynamic role ${spec.id} failed:`, err);
          }
        }
      } catch (err) {
        console.error('[coordinator] CEO role-gap detection failed:', err);
      }
    }

    // CEO arbitration: prioritize insights & approve high-confidence decisions
    const ceo = this.getAgent('ceo');
    let ceoSummary = 'Autonomous crew ran with partial output.';
    try {
      const ceoAnalysis = analyses.get('ceo')!;
      ceoSummary = await this.arbitrate(ceo, ceoAnalysis, insights, decisions, options);
    } catch (err) {
      console.error('[coordinator] CEO arbitration failed:', err);
    }

    const run: CrewRun = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      context,
      decisions: executiveState.getDecisions(),
      insights: executiveState.getInsights(),
      actionItems: executiveState.getActionItems(),
      executions: [],
      summary: ceoSummary,
    };
    executiveState.recordRun(run);
    return run;
  }

  /**
   * CEO reviews all insights/decisions and produces a prioritized narrative.
   * In autonomous mode it also approves decisions above the confidence gate.
   */
  private async arbitrate(
    ceo: BaseExecutiveAgent,
    ceoAnalysis: ExecutiveAnalysis,
    insights: Awaited<ReturnType<BaseExecutiveAgent['generateInsights']>>,
    decisions: Awaited<ReturnType<BaseExecutiveAgent['makeDecisions']>>,
    options: CrewRunOptions
  ): Promise<string> {
    const sortedInsights = [...insights].sort((a, b) => {
      const rank = (x: string) => ({ high: 0, medium: 1, low: 2 }[x] ?? 1);
      const urg = (x: string) => ({ immediate: 0, this_week: 1, this_month: 2, this_quarter: 3 }[x] ?? 2);
      return rank(a.impact) - rank(b.impact) || urg(a.urgency) - urg(b.urgency);
    });

    const topInsights = sortedInsights.slice(0, 5).map((i) => `- [${i.impact}/${i.urgency}] ${i.insight}`);
    const topDecisions = decisions.slice(0, 5).map((d) => `- ${d.decision} (conf ${(d.expectedOutcome.confidence * 100).toFixed(0)}%)`);

    const gate = options.autoApproveConfidence ?? 0.7;
    // Appointed (synthetic) roles auto-approve at the same confidence bar as the
    // static crew. Their safety does NOT come from a higher confidence bar — it
    // comes from the engine's risk-tier hold (external/irreversible actions are
    // held for a human) plus the trust brake (a role whose executed work
    // consistently fails measurement is auto-paused). That is the balance: a
    // synthetic role gets real, reversible effect, but cannot cause outward harm.
    const SYNTHETIC_GATE = 0.7;
    if (options.autoApprove) {
      for (const d of decisions) {
        const isStatic = this.staticRoles.has(d.role);
        const roleGate = isStatic ? gate : SYNTHETIC_GATE;

        // Trust brake: demote roles whose executed work consistently fails
        // measurement. This is the balance — a dynamic role gets real effect,
        // but if it produces wrong/no effect it is auto-paused, not allowed to
        // keep causing harm.
        if (!executiveState.isRoleTrusted(d.role)) {
          console.log(`[coordinator] role "${d.role}" demoted (low confirmation) — pausing auto-approval`);
          continue;
        }

        // Synthetic roles may auto-execute, but only their *low-risk* decisions
        // (analysis/reports/plans). High-risk external actions (posting, live
        // Meta changes) still require human approval — see engine routing.
        if (d.expectedOutcome.confidence >= roleGate) {
          executiveState.approveDecision(d.id, 'ceo');
        }
      }
    }

    return [
      `CEO health score: ${ceoAnalysis.businessAssessment.healthScore}/100.`,
      `Top strategic insights:`,
      ...topInsights,
      `Key decisions:`,
      ...topDecisions,
      options.autoApprove ? `Autonomous mode: decisions ≥ ${(gate * 100).toFixed(0)}% confidence auto-approved for execution.` : `Decisions pending approval.`,
    ].join('\n');
  }
}

export const coordinator = new ExecutiveCoordinator();
