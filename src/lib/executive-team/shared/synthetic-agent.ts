/**
 * SyntheticAgent — a runtime-created executive agent for a NEW role that the
 * CEO appoints when the team detects a capability gap it cannot cover with the
 * existing roles. It is driven entirely by a RoleSpec (mandate, objectives,
 * success metrics, system prompt) so the CEO can spin up a focused agent for a
 * missing scope without shipping new code for every possible role.
 */

import { BaseExecutiveAgent, ExecutiveAnalysis as IAnalysis } from './base-agent';
import {
  ExecutiveContext,
  ExecutiveRole,
  ExecutiveDecision,
  StrategicInsight,
  ActionItem,
  Recommendation,
  RoleSpec,
  RiskAssessment,
} from './types';

export class SyntheticAgent extends BaseExecutiveAgent {
  private spec: RoleSpec;

  constructor(spec: RoleSpec) {
    // A synthetic role id is not part of the static ExecutiveRole union, but we
    // store it as the role so decisions/insights are attributed correctly.
    super(spec.id as ExecutiveRole);
    this.spec = spec;
  }

  getRoleTitle(): string {
    return this.spec.title;
  }

  getSpec(): RoleSpec {
    return this.spec;
  }

  protected getSystemPrompt(): string {
    return this.spec.systemPrompt;
  }

  async analyze(context: ExecutiveContext): Promise<IAnalysis> {
    this.syncMemory();
    const ebitda = context.businessState.profitability.ebitda;
    const netMargin = context.businessState.profitability.netMargin;
    const health = Math.max(20, Math.min(100, Math.round((ebitda > 0 ? 60 : 45) + netMargin * 40)));

    const businessAssessment = {
      healthScore: health,
      strengths: [this.spec.mandate],
      weaknesses: [`No dedicated ${this.spec.title} capability existed before this role was created`],
      opportunities: this.spec.objectives,
      threats: ['Capability gap delays measurable value if not closed'],
      keyMetrics: {} as Record<string, { value: number; trend: 'up' | 'down' | 'stable'; target: number }>,
    };
    const marketAssessment = {
      attractiveness: 60,
      competitivePosition: 55,
      trends: [],
      threats: [],
      opportunities: this.spec.objectives.map((o) => ({ opportunity: o, effort: 0.5, reward: 0.6 })),
    };
    const initiativeAssessment = {
      onTrack: [],
      atRisk: [],
      behind: [],
      completed: [],
      recommendedChanges: [],
    };
    const resourceAssessment = {
      budgetHealth: 'healthy' as const,
      personnelHealth: 'healthy' as const,
      technologyHealth: 'healthy' as const,
      recommendations: [],
    };
    const recommendations: Recommendation[] = this.spec.objectives.map((o, i) => ({
      id: `rec-${this.spec.id}-${i}`,
      category: 'strategic',
      title: `Stand up: ${o}`,
      description: `${this.spec.title} to deliver ${o} per mandate: ${this.spec.mandate}`,
      rationale: 'Auto-created role to close a measured capability gap in the executive team.',
      expectedImpact: { revenueIncrease: 0.03, costReduction: 0.02, customerAcquisition: 0, retentionImprovement: 0.04, confidence: 0.7 },
      effort: 'medium',
      timeline: '30d',
      owner: this.spec.id as ExecutiveRole,
      dependencies: [],
      risks: ['Newly created role, success depends on accurate mandate'],
      metrics: this.spec.successMetrics,
      priority: (i === 0 ? 'high' : 'medium') as Recommendation['priority'],
    }));
    const confidence = this.calculateConfidence(businessAssessment, marketAssessment);
    return {
      role: this.spec.id as ExecutiveRole,
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence,
    };
  }

  private risk(): RiskAssessment {
    return {
      level: 'low',
      risks: [{ risk: 'Newly created role', probability: 0.3, impact: 0.3, category: 'strategic' }],
      mitigationStrategies: ['Validate via measurement before scaling'],
      contingencyPlans: ['Refine mandate if success metrics not met'],
    };
  }

  async makeDecisions(analysis: IAnalysis): Promise<ExecutiveDecision[]> {
    const out: ExecutiveDecision[] = [];
    for (const r of analysis.recommendations) {
      out.push(await this.makeDecision(r.title, r.rationale, r.expectedImpact, this.risk(), []));
    }
    return out;
  }

  async generateInsights(analysis: IAnalysis): Promise<StrategicInsight[]> {
    return [
      {
        id: `ins-${this.spec.id}-${Date.now()}`,
        category: 'operational',
        insight: `New role "${this.spec.title}" activated to close gap in domain "${this.spec.domain}". Mandate: ${this.spec.mandate}`,
        evidence: this.spec.objectives,
        confidence: analysis.confidence,
        impact: 'medium',
        urgency: 'this_quarter',
        recommendedActions: this.spec.successMetrics,
        owner: this.spec.id as ExecutiveRole,
      },
    ];
  }

  async createActionItems(analysis: IAnalysis): Promise<ActionItem[]> {
    return analysis.recommendations.map((r, i) => ({
      id: `act-${this.spec.id}-${Date.now()}-${i}`,
      title: r.title,
      description: r.description,
      owner: this.spec.id as ExecutiveRole,
      priority: (r.priority ?? 'medium') as ActionItem['priority'],
      dueDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0],
      status: 'pending',
      dependencies: r.dependencies,
      estimatedImpact: r.expectedImpact,
    }));
  }
}
