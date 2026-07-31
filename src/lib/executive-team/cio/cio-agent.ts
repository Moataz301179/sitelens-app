/**
 * Intelligence Officer (CIO) — the team's "eyes and ears".
 *
 * Owns market, competitor, regulatory and technology intelligence. Crucially it
 * also runs the **opportunity radar**: it identifies business-model expansion
 * plays (affiliate programs, dropshipping, shipping/delivery optimization) and
 * publishes them to the shared brain so the COO can validate and execute them.
 * This is the "all-team including the intelligence officer" scope the CEO asked
 * for — the IO sources the signal, the operators turn it into value.
 */

import { BaseExecutiveAgent, ExecutiveAnalysis as IAnalysis } from '../shared/base-agent';
import {
  ExecutiveContext,
  ExecutiveRole,
  ExecutiveDecision,
  StrategicInsight,
  ActionItem,
  Recommendation,
  Opportunity,
  RiskAssessment,
} from '../shared/types';

export class CIOAgent extends BaseExecutiveAgent {
  constructor() {
    super('cio');
  }

  protected getSystemPrompt(): string {
    return `You are the Chief Intelligence Officer of the executive AI team. Your job is to monitor markets, competitors, technology and regulation, and to surface business-model expansion opportunities (affiliate, dropship, shipping/delivery). You identify; the operators validate and execute.`;
  }

  async analyze(context: ExecutiveContext): Promise<IAnalysis> {
    this.syncMemory();
    const opps = this.scanOpportunities(context);
    // Publish to the shared brain so COO/CMO/CFO see it on the spot.
    this.shareMemory('opportunities', opps);

    const market = context.marketConditions;
    const competitors = market.competitorAnalysis.length;
    const positiveTrends = market.industryTrends.filter((t) => t.impact === 'positive').length;
    const highThreats = market.competitorAnalysis.filter((c) => c.threatLevel === 'high').length;
    const attractiveness = Math.min(100, Math.max(20, 45 + positiveTrends * 8 - highThreats * 5));
    const competitivePosition = Math.min(100, Math.max(20, 90 - competitors * 9));
    const healthScore = Math.max(0, Math.min(100, 70 - highThreats * 6 + positiveTrends * 3));

    const businessAssessment = {
      healthScore,
      strengths: ['Continuous market + competitive monitoring active'],
      weaknesses: highThreats > 1 ? ['Elevated competitive pressure'] : ['No major blind spots detected'],
      opportunities: opps.map((o) => o.title),
      threats: market.competitorAnalysis.map((c) => c.competitor),
      keyMetrics: {
        competitorPressure: { value: competitors, trend: 'stable' as const, target: 5 },
        opportunityPipeline: { value: opps.length, trend: 'up' as const, target: 8 },
      },
    };

    const marketAssessment = {
      attractiveness,
      competitivePosition,
      trends: market.industryTrends.map((t) => ({
        trend: t.trend,
        impact: t.confidence,
        actionable: t.confidence > 0.5,
      })),
      threats: market.competitorAnalysis
        .filter((c) => c.threatLevel === 'high')
        .map((c) => ({ threat: c.competitor, likelihood: 0.6, impact: 0.6 })),
      opportunities: opps.map((o) => ({ opportunity: o.title, effort: 0.5, reward: o.estimatedValue / 10000 })),
    };

    const recommendations: Recommendation[] = opps.map((o) => ({
      id: `rec-cio-${o.id}`,
      category: 'strategic',
      title: `Pursue opportunity: ${o.title}`,
      description: o.description,
      rationale: `Identified by Intelligence Officer with ${Math.round(o.applicability * 100)}% applicability; est. value $${o.estimatedValue}/mo. Hand to COO for validation.`,
      expectedImpact: {
        revenueIncrease: o.estimatedValue / 200000,
        costReduction: 0.01,
        customerAcquisition: 0,
        retentionImprovement: 0.02,
        confidence: o.applicability,
      },
      effort: o.type === 'affiliate' ? 'low' : 'medium',
      timeline: '45d',
      owner: 'coo',
      dependencies: [],
      risks: o.risks,
      metrics: ['validated_opportunity_count', 'opportunity_revenue_contribution'],
      priority: 'medium',
    }));

    const confidence = this.calculateConfidence(businessAssessment, marketAssessment);

    return {
      role: 'cio',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment: { onTrack: [], atRisk: [], behind: [], completed: [], recommendedChanges: [] },
      resourceAssessment: { budgetHealth: 'healthy', personnelHealth: 'healthy', technologyHealth: 'healthy', recommendations: [] },
      recommendations,
      confidence,
      strategicInsights: this.generateOpportunityInsights(opps),
    };
  }

  /**
   * Opportunity radar — deterministic heuristic scan of the context for
   * business-model expansion plays. Pure identification; no validation here
   * (that is the COO's job once it reads these from shared memory).
   */
  scanOpportunities(context: ExecutiveContext): Opportunity[] {
    const opps: Opportunity[] = [];
    const rev = context.businessState.revenue;
    const growth = context.businessState.growth;
    const margin = context.businessState.profitability.grossMargin;
    const hasTraffic = context.marketConditions.demandSignals.some((d) => d.strength > 0.4);
    const mrr = rev.monthlyRecurring;
    const marketShare = growth.marketShare;

    // 1) Affiliate programs
    if (hasTraffic && marketShare > 0.1 && margin > 0.3) {
      opps.push({
        id: 'opp-affiliate',
        type: 'affiliate',
        title: 'Affiliate / referral partner program',
        description: 'Launch an affiliate program to monetize existing traffic via partner referrals with performance-based payouts.',
        applicability: 0.7,
        estimatedValue: Math.round(mrr * 0.12),
        risks: ['Fraud / low-quality referrals', 'Brand dilution if partners misaligned'],
        identifiedBy: 'cio',
      });
    }

    // 2) Dropshipping for applicable products
    if (margin > 0.35) {
      opps.push({
        id: 'opp-dropship',
        type: 'dropship',
        title: 'Dropshipping for applicable catalog items',
        description: 'Offer a curated set of complementary products via dropship suppliers to expand catalog without inventory risk.',
        applicability: 0.55,
        estimatedValue: Math.round(mrr * 0.08),
        risks: ['Supplier reliability', 'Quality control', 'Margin compression'],
        identifiedBy: 'cio',
      });
    }

    // 3) Shipping / delivery optimization
    opps.push({
      id: 'opp-shipping',
      type: 'shipping',
      title: 'Shipping & delivery condition optimization',
      description: 'Optimize fulfillment regions and delivery SLAs to reduce cost-to-serve and lift conversion/retention.',
      applicability: 0.6,
      estimatedValue: Math.round(mrr * 0.05),
      risks: ['Fulfillment partner lock-in', 'Carrier rate volatility'],
      identifiedBy: 'cio',
    });

    return opps;
  }

  private generateOpportunityInsights(opps: Opportunity[]): StrategicInsight[] {
    return opps.map((o) => ({
      id: `ins-cio-${o.id}`,
      category: 'market',
      insight: `Opportunity radar flagged ${o.type} play — ${o.description} (applicability ${Math.round(o.applicability * 100)}%, est. $${o.estimatedValue}/mo). Awaiting COO validation.`,
      evidence: [`Applicability ${Math.round(o.applicability * 100)}%`, `Est. value $${o.estimatedValue}/mo`, ...o.risks],
      confidence: o.applicability,
      impact: 'medium',
      urgency: 'this_quarter',
      recommendedActions: ['COO to run validation tests', 'CFO to size P&L impact'],
      owner: 'cio',
    }));
  }

  private risk(): RiskAssessment {
    return {
      level: 'medium',
      risks: [{ risk: 'Unvalidated opportunity', probability: 0.4, impact: 0.3, category: 'strategic' }],
      mitigationStrategies: ['Validate before execution via COO gate'],
      contingencyPlans: ['Reassess in next cycle'],
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
    return analysis.strategicInsights ?? [];
  }

  async createActionItems(analysis: IAnalysis): Promise<ActionItem[]> {
    return analysis.recommendations.map((r, i) => ({
      id: `act-cio-${Date.now()}-${i}`,
      title: r.title,
      description: r.description,
      owner: 'coo',
      priority: (r.priority ?? 'medium') as ActionItem['priority'],
      dueDate: new Date(Date.now() + 45 * 24 * 3600000).toISOString().split('T')[0],
      status: 'pending',
      dependencies: [],
      estimatedImpact: r.expectedImpact,
    }));
  }
}
