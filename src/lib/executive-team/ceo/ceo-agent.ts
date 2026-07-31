/**
 * Executive AI Team - CEO Agent
 * Chief Executive Officer: Strategic vision, overall P&L ownership, capital allocation, board communication
 */

import { BaseExecutiveAgent, ExecutiveAnalysis } from '../shared/base-agent';
import { 
  ExecutiveContext, 
  ExecutiveRole, 
  ExecutiveDecision, 
  StrategicInsight,
  ActionItem,
  ExpectedImpact,
  RiskAssessment,
  BusinessState,
  MarketConditions,
  Initiative,
  ResourceAllocation,
  InitiativeChange,
  ResourceRecommendation,
  Recommendation,
  AgentCommunication,
  RoleSpec,
} from '../shared/types';

export class CEOAgent extends BaseExecutiveAgent {
  private boardReporting: BoardReport | null = null;
  private investorRelations: InvestorRelations | null = null;
  private strategicVision: StrategicVision | null = null;

  constructor() {
    super('ceo');
  }

  protected getSystemPrompt(): string {
    return `You are the CEO of an AI-powered website audit platform. You own the overall strategy, P&L, capital allocation, and long-term vision.

CORE RESPONSIBILITIES:
1. Set and communicate strategic vision
2. Own overall P&L and financial outcomes
3. Allocate capital across initiatives for maximum ROI
4. Build and lead executive team
5. Manage board and investor relationships
6. Make final decisions on strategic direction
7. Ensure company culture and values alignment

DECISION FRAMEWORK:
- Always think 3-5 years ahead while executing quarterly
- Prioritize sustainable growth over short-term optimization
- Balance innovation with operational excellence
- Make decisions with incomplete information (bias for action)
- Consider second and third-order effects
- Protect and grow the company's moat

KEY METRICS YOU OWN:
- ARR Growth Rate
- Net Revenue Retention
- Gross Margin
- CAC Payback Period
- LTV:CAC Ratio
- Rule of 40 (Growth + Profitability)
- Market Share
- Brand Equity

COMMUNICATION STYLE:
- Direct, decisive, visionary
- Data-informed but not data-dependent
- Inspiring to team, credible to board
- Transparent about risks and uncertainties`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessBusiness(context),
      this.assessMarket(context),
      this.assessInitiatives(context),
      this.assessResources(context),
    ]);

    const recommendations = await this.generateRecommendations(
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    return {
      role: 'ceo',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  private async assessBusiness(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const { revenue, profitability, growth, customerMetrics } = context.businessState;
    
    const healthScore = this.calculateBusinessHealthScore(context.businessState);
    
    return {
      healthScore,
      strengths: this.identifyStrengths(context.businessState),
      weaknesses: this.identifyWeaknesses(context.businessState),
      opportunities: this.identifyOpportunities(context),
      threats: this.identifyThreats(context),
      keyMetrics: {
        'ARR Growth': { value: growth.revenueGrowthRate, trend: growth.revenueGrowthRate > 0.2 ? 'up' : growth.revenueGrowthRate > 0 ? 'up' : 'down', target: 1.0 },
        'Net Revenue Retention': { value: customerMetrics.totalCustomers > 0 ? (customerMetrics.newCustomers - customerMetrics.churnedCustomers) / customerMetrics.totalCustomers : 0, trend: 'up', target: 1.2 },
        'Gross Margin': { value: profitability.grossMargin, trend: profitability.grossMargin > 0.7 ? 'up' : 'stable', target: 0.8 },
        'CAC Payback': { value: profitability.unitEconomics.paybackPeriod, trend: profitability.unitEconomics.paybackPeriod < 12 ? 'down' : 'up', target: 12 },
        'LTV:CAC': { value: profitability.unitEconomics.ltvToCacRatio, trend: profitability.unitEconomics.ltvToCacRatio > 3 ? 'up' : 'stable', target: 5 },
        'Rule of 40': { value: growth.revenueGrowthRate * 100 + profitability.netMargin * 100, trend: 'up', target: 40 },
      },
    };
  }

  private calculateBusinessHealthScore(state: BusinessState): number {
    let score = 0;
    score += Math.min(state.growth.revenueGrowthRate * 50, 25); // Growth max 25
    score += Math.min(state.profitability.netMargin * 100, 25); // Profitability max 25
    score += Math.min(state.profitability.unitEconomics.ltvToCacRatio * 5, 20); // Unit economics max 20
    score += Math.min((1 - state.revenue.churnRate) * 15, 15); // Retention max 15
    score += Math.min(state.customerMetrics.nps / 100 * 15, 15); // NPS max 15
    return Math.round(score);
  }

  private identifyStrengths(state: BusinessState): string[] {
    const strengths: string[] = [];
    if (state.growth.revenueGrowthRate > 0.5) strengths.push('Exceptional revenue growth');
    if (state.profitability.grossMargin > 0.75) strengths.push('Strong gross margins');
    if (state.profitability.unitEconomics.ltvToCacRatio > 3) strengths.push('Excellent unit economics');
    if (state.customerMetrics.nps > 50) strengths.push('High customer satisfaction');
    if (state.revenue.churnRate < 0.05) strengths.push('Low churn rate');
    if (state.growth.viralCoefficient > 1) strengths.push('Viral growth engine');
    return strengths.length > 0 ? strengths : ['Building foundational capabilities'];
  }

  private identifyWeaknesses(state: BusinessState): string[] {
    const weaknesses: string[] = [];
    if (state.growth.revenueGrowthRate < 0.2) weaknesses.push('Below-target growth rate');
    if (state.profitability.netMargin < 0.1) weaknesses.push('Low profitability');
    if (state.profitability.unitEconomics.paybackPeriod > 18) weaknesses.push('Long CAC payback period');
    if (state.revenue.churnRate > 0.1) weaknesses.push('High churn rate');
    if (state.customerMetrics.nps < 30) weaknesses.push('Low customer satisfaction');
    if (state.costs.cac > state.revenue.averageContractValue * 0.5) weaknesses.push('High customer acquisition cost');
    return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified'];
  }

  private identifyOpportunities(context: ExecutiveContext): string[] {
    const opportunities: string[] = [];
    const { auditResults, marketConditions } = context;
    
    // Revenue expansion from audit results
    const totalRevenuePotential = auditResults.reduce((sum, a) => sum + a.potentialRevenueImpact, 0);
    if (totalRevenuePotential > 100000) {
      opportunities.push(`$${(totalRevenuePotential/1000).toFixed(0)}K+ revenue potential from audit pipeline`);
    }

    // Market opportunities
    marketConditions.demandSignals.filter(s => s.actionable).forEach(s => {
      opportunities.push(`Actionable demand signal: ${s.signal}`);
    });

    marketConditions.industryTrends.filter(t => t.impact === 'positive').forEach(t => {
      opportunities.push(`Positive trend: ${t.trend}`);
    });

    // Competitive gaps
    marketConditions.competitorAnalysis.filter(c => c.threatLevel === 'low').forEach(c => {
      opportunities.push(`Competitor weakness in ${c.weaknesses.join(', ')}`);
    });

    return opportunities.length > 0 ? opportunities : ['Exploring new market segments'];
  }

  private identifyThreats(context: ExecutiveContext): string[] {
    const threats: string[] = [];
    const { marketConditions, businessState } = context;

    marketConditions.competitorAnalysis.filter(c => c.threatLevel === 'high').forEach(c => {
      threats.push(`High threat from ${c.competitor}: ${c.recentMoves[0]?.action || 'aggressive moves'}`);
    });

    marketConditions.industryTrends.filter(t => t.impact === 'negative').forEach(t => {
      threats.push(`Negative trend: ${t.trend}`);
    });

    marketConditions.regulatoryEnvironment.filter(r => r.impact === 'negative').forEach(r => {
      threats.push(`Regulatory risk: ${r.regulation} (cost: $${r.complianceCost})`);
    });

    if (businessState.profitability.unitEconomics.paybackPeriod > 24) {
      threats.push('Unsustainable unit economics - payback period too long');
    }

    if (businessState.revenue.churnRate > 0.15) {
      threats.push('Churn rate threatens growth sustainability');
    }

    return threats.length > 0 ? threats : ['No immediate threats identified'];
  }

  private async assessMarket(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    const { marketConditions } = context;
    
    return {
      attractiveness: this.calculateMarketAttractiveness(marketConditions),
      competitivePosition: this.calculateCompetitivePosition(marketConditions),
      trends: marketConditions.industryTrends.map(t => ({
        trend: t.trend,
        impact: t.impact === 'positive' ? 1 : t.impact === 'negative' ? -1 : 0,
        actionable: t.confidence > 0.7,
      })),
      threats: marketConditions.competitorAnalysis
        .filter(c => c.threatLevel === 'high' || c.threatLevel === 'medium')
        .map(c => ({
          threat: `${c.competitor}: ${c.recentMoves[0]?.action || 'market pressure'}`,
          likelihood: c.threatLevel === 'high' ? 0.7 : 0.4,
          impact: c.marketShare * 100,
        })),
      opportunities: marketConditions.demandSignals
        .filter(s => s.actionable)
        .map(s => ({
          opportunity: s.signal,
          effort: 1 / s.strength,
          reward: s.strength * 100,
        })),
    };
  }

  private calculateMarketAttractiveness(market: MarketConditions): number {
    let score = 50;
    score += market.marketSize.growthRate * 100; // Growth adds points
    score += (market.marketSize.som / market.marketSize.tam) * 50; // Market penetration potential
    score -= market.competitorAnalysis.filter(c => c.threatLevel === 'high').length * 10;
    score += market.demandSignals.filter(s => s.actionable).length * 5;
    return Math.max(0, Math.min(100, score));
  }

  private calculateCompetitivePosition(market: MarketConditions): number {
    // Simplified - would use actual competitive analysis
    const ourShare = 0.05; // 5% assumed
    const leaderShare = Math.max(...market.competitorAnalysis.map(c => c.marketShare));
    return Math.min(100, (ourShare / leaderShare) * 100);
  }

  private async assessInitiatives(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const { activeInitiatives } = context;
    
    const onTrack = activeInitiatives.filter(i => i.status === 'active' && this.isOnTrack(i));
    const atRisk = activeInitiatives.filter(i => i.status === 'active' && !this.isOnTrack(i) && !this.isBehind(i));
    const behind = activeInitiatives.filter(i => i.status === 'active' && this.isBehind(i));
    const completed = activeInitiatives.filter(i => i.status === 'completed');
    
    const recommendedChanges = await this.recommendInitiativeChanges(activeInitiatives);

    return { onTrack, atRisk, behind, completed, recommendedChanges };
  }

  private isOnTrack(initiative: Initiative): boolean {
    // Simplified - would check actual vs planned progress
    return initiative.status === 'active' && (!initiative.timeline.milestones.some(m => m.status === 'delayed'));
  }

  private isBehind(initiative: Initiative): boolean {
    return initiative.timeline.milestones.some(m => m.status === 'delayed');
  }

  private async recommendInitiativeChanges(initiatives: Initiative[]): Promise<InitiativeChange[]> {
    const changes: InitiativeChange[] = [];
    
    for (const initiative of initiatives) {
      if (initiative.status === 'active') {
        const roi = initiative.expectedImpact.revenueIncrease / initiative.resources.budget;
        if (roi < 1) {
          changes.push({
            initiativeId: initiative.id,
            change: 'pause',
            reason: `ROI (${roi.toFixed(2)}) below threshold`,
            expectedImpact: { revenueIncrease: 0, costReduction: initiative.resources.budget, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
          });
        } else if (roi > 5) {
          changes.push({
            initiativeId: initiative.id,
            change: 'add_resources',
            reason: `Exceptional ROI (${roi.toFixed(2)}) warrants acceleration`,
            expectedImpact: { 
              revenueIncrease: initiative.expectedImpact.revenueIncrease * 1.5, 
              costReduction: 0, 
              customerAcquisition: initiative.expectedImpact.customerAcquisition * 1.3, 
              retentionImprovement: 0, 
              confidence: 0.7 
            },
          });
        }
      }
    }
    
    return changes;
  }

  private async assessResources(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { budget, personnel, technology } = context.resourceAllocation;
    
    const budgetHealth = budget.available / budget.total > 0.2 ? 'healthy' : budget.available / budget.total > 0.1 ? 'tight' : 'critical';
    const personnelHealth = personnel.utilization < 0.8 ? 'healthy' : personnel.utilization < 0.95 ? 'stretched' : 'overloaded';
    const technologyHealth = technology.computeBudget > 0 ? 'healthy' : 'needs_investment';

    const recommendations: ResourceRecommendation[] = [];
    
    if (budgetHealth !== 'healthy') {
      recommendations.push({
        type: 'budget',
        action: 'increase',
        amount: budget.total * 0.2,
        reason: 'Insufficient runway for growth initiatives',
        priority: 'high',
      });
    }
    
    if (personnelHealth === 'overloaded') {
      recommendations.push({
        type: 'personnel',
        action: 'increase',
        amount: Math.ceil(personnel.total * 0.2),
        reason: 'Team overloaded, need to hire',
        priority: 'high',
      });
    }

    return {
      budgetHealth,
      personnelHealth,
      technologyHealth,
      recommendations,
    };
  }

  private async generateRecommendations(
    business: ExecutiveAnalysis['businessAssessment'],
    market: ExecutiveAnalysis['marketAssessment'],
    initiatives: ExecutiveAnalysis['initiativeAssessment'],
    resources: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Strategic recommendations from business assessment
    if (business.healthScore < 60) {
      recommendations.push({
        id: `rec-ceo-${Date.now()}-1`,
        category: 'strategic',
        title: 'Urgent: Business Health Recovery Plan',
        description: 'Business health score below 60. Immediate action required on growth and profitability.',
        rationale: `Health score: ${business.healthScore}. Key issues: ${business.weaknesses.join(', ')}`,
        expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0.2, confidence: 0.8 },
        effort: 'high',
        timeline: '30 days',
        owner: 'ceo',
        dependencies: [],
        risks: ['Team burnout', 'Customer disruption'],
        metrics: ['Health score', 'Revenue growth', 'Net margin'],
      });
    }

    // Market-based recommendations
    if (market.attractiveness > 70 && market.competitivePosition < 50) {
      recommendations.push({
        id: `rec-ceo-${Date.now()}-2`,
        category: 'strategic',
        title: 'Aggressive Market Capture Strategy',
        description: 'High market attractiveness but low competitive position. Invest in differentiation and go-to-market.',
        rationale: `Market attractiveness: ${market.attractiveness}, Competitive position: ${market.competitivePosition}`,
        expectedImpact: { revenueIncrease: 500000, costReduction: 0, customerAcquisition: 100, retentionImprovement: 0, confidence: 0.7 },
        effort: 'high',
        timeline: '90 days',
        owner: 'ceo',
        dependencies: ['cmo-go-to-market', 'cto-product-differentiation'],
        risks: ['Competitive response', 'Execution risk'],
        metrics: ['Market share', 'ARR growth', 'Brand awareness'],
      });
    }

    // Initiative-based recommendations
    for (const change of initiatives.recommendedChanges) {
      recommendations.push({
        id: `rec-ceo-${Date.now()}-${change.initiativeId}`,
        category: 'operational',
        title: `${change.change.replace('_', ' ').toUpperCase()}: ${change.initiativeId}`,
        description: change.reason,
        rationale: change.reason,
        expectedImpact: change.expectedImpact,
        effort: change.change.includes('resources') ? 'medium' : 'low',
        timeline: '30 days',
        owner: 'ceo',
        dependencies: [],
        risks: ['Resource constraints'],
        metrics: ['Initiative ROI', 'Timeline adherence'],
      });
    }

    // Resource-based recommendations
    for (const rec of resources.recommendations) {
      recommendations.push({
        id: `rec-ceo-${Date.now()}-resource-${rec.type}`,
        category: 'financial',
        title: `${rec.action.toUpperCase()} ${rec.type} allocation`,
        description: rec.reason,
        rationale: rec.reason,
        expectedImpact: { revenueIncrease: 0, costReduction: rec.amount * 0.3, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.6 },
        effort: 'low',
        timeline: '14 days',
        owner: 'ceo',
        dependencies: rec.type === 'personnel' ? ['cto-hiring', 'cfo-budget'] : [],
        risks: ['Hiring delays', 'Budget approval'],
        metrics: ['Runway', 'Team utilization', 'Output per head'],
      });
    }

    return recommendations;
  }

  /**
   * Detect capability gaps in the current executive team and propose NEW roles
   * the CEO should appoint to close them. This is the "CEO appoints new roles
   * for missing scope" capability — each returned RoleSpec can be instantiated
   * at runtime as a SyntheticAgent by the coordinator, with measurable success
   * metrics, so no valuable mission is left uncovered.
   *
   * Aggressive but grounded: every trigger is tied to a concrete metric in the
   * context (no hallucinated gaps). The coordinator applies further guardrails
   * (unique id, no domain overlap, per-run cap, spec completeness) before any
   * role is actually created.
   */
  proposeNewRoles(context: ExecutiveContext): RoleSpec[] {
    const specs: RoleSpec[] = [];
    const rev = context.businessState.revenue;
    const growth = context.businessState.growth;
    const criticalIssues = context.auditResults
      .flatMap((a) => a.topIssues)
      .filter((i) => i.severity === 'critical').length;
    const highThreats = context.marketConditions.competitorAnalysis.filter((c) => c.threatLevel === 'high').length;
    const negativeRegulation = context.marketConditions.regulatoryEnvironment.some((r) => r.impact === 'negative');
    const nps = context.businessState.customerMetrics.nps;

    // Gap: high churn → Chief Retention Officer
    if (rev.churnRate > 0.08) {
      specs.push({
        id: 'cro_retention',
        title: 'Chief Retention Officer',
        mandate: `Own net revenue retention and reduce churn from ${(rev.churnRate * 100).toFixed(1)}% to below 5% via lifecycle, onboarding and win-back programs.`,
        systemPrompt: 'You are the Chief Retention Officer. You own churn reduction, lifecycle marketing, onboarding and customer success alignment.',
        objectives: ['Reduce churn below 5%', 'Launch lifecycle/onboarding program', 'Improve NRR above 110%'],
        successMetrics: ['churn_rate', 'net_revenue_retention', 'onboarding_completion'],
        createdBy: 'ceo',
        domain: 'customer_retention',
      });
    }

    // Gap: low growth → Chief Growth Officer
    if (growth.userGrowthRate < 0.1) {
      specs.push({
        id: 'cgo_growth',
        title: 'Chief Growth Officer',
        mandate: `Accelerate user growth from ${(growth.userGrowthRate * 100).toFixed(1)}% by owning acquisition loops, partnerships and virality.`,
        systemPrompt: 'You are the Chief Growth Officer. You own top-of-funnel growth, referral/viral loops and partnership-driven acquisition.',
        objectives: ['Double user growth rate', 'Stand up referral loop', 'Launch 3 partnership channels'],
        successMetrics: ['user_growth_rate', 'qualified_signups', 'referral_rate'],
        createdBy: 'ceo',
        domain: 'growth',
      });
    }

    // Gap: aggressive high-threat competition → Partnerships & Alliances lead
    if (highThreats >= 2) {
      specs.push({
        id: 'vp_alliances',
        title: 'VP, Partnerships & Alliances',
        mandate: `Counter competitive pressure (${highThreats} high-threat competitors) by building partnerships, integrations and channel alliances.`,
        systemPrompt: 'You are the VP of Partnerships & Alliances. You own strategic partnerships, integrations and co-marketing.',
        objectives: ['Sign 5 strategic partnerships', 'Launch integration marketplace', 'Build co-marketing engine'],
        successMetrics: ['partnerships_signed', 'partner_sourced_revenue', 'integration_count'],
        createdBy: 'ceo',
        domain: 'partnerships',
      });
    }

    // Gap: critical site/security issues → Chief Information Security Officer
    if (criticalIssues >= 2) {
      specs.push({
        id: 'ciso',
        title: 'Chief Information Security Officer',
        mandate: `Close ${criticalIssues} critical issues and own security posture, threat modeling and compliance readiness.`,
        systemPrompt: 'You are the CISO. You own application/infra security, incident response readiness and compliance.',
        objectives: ['Remediate all critical issues', 'Establish security baseline', 'Achieve SOC2-ready controls'],
        successMetrics: ['critical_issues_open', 'security_score', 'mean_time_to_remediate'],
        createdBy: 'ceo',
        domain: 'security',
      });
    }

    // Gap: negative regulatory exposure → Chief Compliance Officer
    if (negativeRegulation) {
      specs.push({
        id: 'cco_compliance',
        title: 'Chief Compliance Officer',
        mandate: 'Manage negative regulatory exposure and own compliance posture across product, data and marketing.',
        systemPrompt: 'You are the Chief Compliance Officer. You own regulatory compliance, data governance and risk.',
        objectives: ['Map regulatory obligations', 'Close compliance gaps', 'Stand up data-governance program'],
        successMetrics: ['open_compliance_gaps', 'regulatory_fines_risk', 'audit_readiness'],
        createdBy: 'ceo',
        domain: 'legal_compliance',
      });
    }

    // Gap: weak customer sentiment → VP Customer Success
    if (nps < 30) {
      specs.push({
        id: 'vp_customer_success',
        title: 'VP, Customer Success',
        mandate: `Lift NPS from ${nps} to above 50 via onboarding, health-scoring and proactive success motion.`,
        systemPrompt: 'You are the VP of Customer Success. You own onboarding, adoption, renewals and advocacy.',
        objectives: ['Raise NPS above 50', 'Build health-score model', 'Reduce downgrade rate'],
        successMetrics: ['nps', 'expansion_revenue', 'gross_revenue_retention'],
        createdBy: 'ceo',
        domain: 'customer_success',
      });
    }

    return specs;
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];

    // Strategic decisions based on recommendations
    for (const rec of analysis.recommendations.filter(r => r.category === 'strategic' && r.priority === 'high')) {
      const decision = await this.makeDecision(
        rec.title,
        rec.rationale,
        rec.expectedImpact,
        {
          level: 'high',
          risks: rec.risks.map(r => ({ risk: r, probability: 0.3, impact: 0.7, category: 'strategic' })),
          mitigationStrategies: ['Phased rollout', 'Regular checkpoints', 'Kill criteria defined'],
          contingencyPlans: ['Pivot to alternative', 'Reduce scope', 'Extend timeline'],
        },
        rec.dependencies.map(d => ({
          description: d,
          pros: ['Aligned with strategy'],
          cons: ['Dependency risk'],
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 },
        }))
      );
      decisions.push(decision);
    }

    // Resource allocation decisions
    for (const rec of analysis.recommendations.filter(r => r.category === 'financial')) {
      const decision = await this.makeDecision(
        rec.title,
        rec.rationale,
        rec.expectedImpact,
        {
          level: 'medium',
          risks: rec.risks.map(r => ({ risk: r, probability: 0.2, impact: 0.5, category: 'financial' })),
          mitigationStrategies: ['Staged investment', 'ROI checkpoints'],
          contingencyPlans: ['Revert if metrics not met'],
        },
        []
      );
      decisions.push(decision);
    }

    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];

    // Business health insight
    if (analysis.businessAssessment.healthScore < 70) {
      insights.push({
        id: `insight-ceo-${Date.now()}-health`,
        category: 'financial',
        insight: `Business health at ${analysis.businessAssessment.healthScore}/100 - requires immediate strategic intervention`,
        evidence: [
          `Growth: ${analysis.businessAssessment.keyMetrics['ARR Growth'].value}`,
          `Margin: ${analysis.businessAssessment.keyMetrics['Gross Margin'].value}`,
          `LTV:CAC: ${analysis.businessAssessment.keyMetrics['LTV:CAC'].value}`,
        ],
        confidence: 0.9,
        impact: 'high',
        urgency: 'immediate',
        recommendedActions: [
          'Convene emergency leadership meeting',
          'Review all initiatives for ROI',
          'Implement cost optimization',
          'Accelerate high-ROI growth initiatives',
        ],
        owner: 'ceo',
      });
    }

    // Market opportunity insight
    if (analysis.marketAssessment.attractiveness > 75) {
      insights.push({
        id: `insight-ceo-${Date.now()}-market`,
        category: 'market',
        insight: `Market attractiveness score of ${analysis.marketAssessment.attractiveness}/100 indicates significant growth opportunity`,
        evidence: [
          `Market growth rate: ${this.getContext()?.marketConditions.marketSize.growthRate}`,
          `Actionable demand signals: ${this.getContext()?.marketConditions.demandSignals.filter(s => s.actionable).length}`,
        ],
        confidence: 0.8,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Increase marketing investment',
          'Accelerate product roadmap',
          'Expand sales capacity',
          'Build competitive moats',
        ],
        owner: 'ceo',
      });
    }

    // Competitive threat insight
    const highThreats = analysis.marketAssessment.threats.filter(t => t.likelihood > 0.5);
    if (highThreats.length > 0) {
      insights.push({
        id: `insight-ceo-${Date.now()}-competitive`,
        category: 'competitive',
        insight: `${highThreats.length} high-likelihood competitive threats identified`,
        evidence: highThreats.map(t => t.threat),
        confidence: 0.75,
        impact: 'high',
        urgency: 'this_month',
        recommendedActions: [
          'Deep competitive analysis',
          'Accelerate differentiation',
          'Strengthen customer retention',
          'Prepare competitive response playbooks',
        ],
        owner: 'ceo',
      });
    }

    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    // Convert high-priority recommendations to action items
    for (const rec of analysis.recommendations.filter(r => r.priority === 'high' || r.category === 'strategic')) {
      actions.push({
        id: `action-ceo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title,
        description: rec.description,
        owner: rec.owner,
        priority: rec.effort === 'high' ? 'critical' : 'high',
        dueDate: new Date(Date.now() + this.parseTimeline(rec.timeline)).toISOString().split('T')[0],
        status: 'pending',
        dependencies: rec.dependencies,
        estimatedImpact: rec.expectedImpact,
      });
    }

    // Add insight-driven actions
    for (const insight of analysis.strategicInsights || []) {
      if (insight.urgency === 'immediate' || insight.urgency === 'this_week') {
        actions.push({
          id: `action-ceo-${Date.now()}-insight`,
          title: `Address: ${insight.insight}`,
          description: insight.recommendedActions.join('; '),
          owner: insight.owner,
          priority: insight.urgency === 'immediate' ? 'critical' : 'high',
          dueDate: new Date(Date.now() + (insight.urgency === 'immediate' ? 24 : 7) * 3600000).toISOString().split('T')[0],
          status: 'pending',
          dependencies: [],
          estimatedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: insight.confidence },
        });
      }
    }

    return actions;
  }

  private parseTimeline(timeline: string): number {
    const match = timeline.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return 30 * 24 * 3600000; // 30 days default
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('day')) return value * 24 * 3600000;
    if (unit.startsWith('week')) return value * 7 * 24 * 3600000;
    if (unit.startsWith('month')) return value * 30 * 24 * 3600000;
    return 30 * 24 * 3600000;
  }

  // CEO-specific methods
  async generateBoardReport(): Promise<BoardReport> {
    const context = this.getContext();
    if (!context) throw new Error('No context available');

    return {
      date: new Date().toISOString(),
      period: 'monthly',
      arr: context.businessState.revenue.annualRecurring,
      arrGrowth: context.businessState.growth.revenueGrowthRate,
      netRevenueRetention: context.businessState.customerMetrics.totalCustomers > 0 
        ? (context.businessState.customerMetrics.newCustomers - context.businessState.customerMetrics.churnedCustomers) / context.businessState.customerMetrics.totalCustomers
        : 0,
      grossMargin: context.businessState.profitability.grossMargin,
      netMargin: context.businessState.profitability.netMargin,
      cacPayback: context.businessState.profitability.unitEconomics.paybackPeriod,
      ltvToCac: context.businessState.profitability.unitEconomics.ltvToCacRatio,
      ruleOf40: context.businessState.growth.revenueGrowthRate * 100 + context.businessState.profitability.netMargin * 100,
      cashRunway: context.businessState.profitability.ebitda > 0 ? 999 : Math.abs(context.businessState.revenue.monthlyRecurring / context.businessState.profitability.ebitda),
      burnRate: context.businessState.profitability.ebitda < 0 ? Math.abs(context.businessState.profitability.ebitda) : 0,
      keyInitiatives: context.activeInitiatives.filter(i => i.status === 'active').map(i => ({
        name: i.name,
        status: i.status,
        expectedImpact: i.expectedImpact,
      })),
      strategicPriorities: this.getStrategicPriorities(context),
      risks: this.getKeyRisks(context),
      asks: this.getBoardAsks(context),
    };
  }

  private getStrategicPriorities(context: ExecutiveContext): string[] {
    const priorities: string[] = [];
    if (context.businessState.growth.revenueGrowthRate < 0.3) priorities.push('Accelerate revenue growth');
    if (context.businessState.profitability.netMargin < 0.15) priorities.push('Improve profitability');
    if (context.businessState.profitability.unitEconomics.ltvToCacRatio < 3) priorities.push('Optimize unit economics');
    if (context.businessState.revenue.churnRate > 0.08) priorities.push('Reduce churn');
    return priorities.length > 0 ? priorities : ['Execute strategic plan'];
  }

  private getKeyRisks(context: ExecutiveContext): string[] {
    const risks: string[] = [];
    if (context.businessState.profitability.ebitda < 0) risks.push('Negative EBITDA - cash burn');
    if (context.businessState.revenue.churnRate > 0.1) risks.push('High churn rate');
    if (context.marketConditions.competitorAnalysis.some(c => c.threatLevel === 'high')) risks.push('Aggressive competition');
    if (context.resourceAllocation.budget.available / context.resourceAllocation.budget.total < 0.15) risks.push('Limited financial runway');
    return risks;
  }

  private getBoardAsks(context: ExecutiveContext): string[] {
    const asks: string[] = [];
    if (context.resourceAllocation.budget.available < context.resourceAllocation.budget.total * 0.2) {
      asks.push('Approve additional capital for growth initiatives');
    }
    if (context.resourceAllocation.personnel.utilization > 0.9) {
      asks.push('Approve headcount plan for key roles');
    }
    return asks;
  }

  async setStrategicVision(vision: StrategicVision): Promise<void> {
    this.strategicVision = vision;
    this.updateMemory('strategicVision', vision);
    
    // Communicate to all executives
    await this.sendCommunication('all', 'decision', {
      type: 'strategic_vision',
      vision,
      message: 'New strategic vision set. All initiatives should align.',
    }, 'high', false);
  }

  getStrategicVision(): StrategicVision | null {
    return this.strategicVision;
  }
}

// Supporting types for CEO
export interface BoardReport {
  date: string;
  period: string;
  arr: number;
  arrGrowth: number;
  netRevenueRetention: number;
  grossMargin: number;
  netMargin: number;
  cacPayback: number;
  ltvToCac: number;
  ruleOf40: number;
  cashRunway: number;
  burnRate: number;
  keyInitiatives: { name: string; status: string; expectedImpact: ExpectedImpact }[];
  strategicPriorities: string[];
  risks: string[];
  asks: string[];
}

export interface InvestorRelations {
  lastUpdate: string;
  nextUpdate: string;
  keyMetrics: Record<string, number>;
  narrative: string;
  concerns: string[];
}

export interface StrategicVision {
  mission: string;
  vision: string; // 3-5 year
  strategy: string; // How we win
  priorities: StrategicPriority[];
  values: string[];
  northStarMetric: string;
  timeHorizon: string;
}

export interface StrategicPriority {
  name: string;
  description: string;
  owner: ExecutiveRole;
  timeline: string;
  successCriteria: string[];
  budget: number;
}