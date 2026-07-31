/**
 * Executive AI Team - CFO Agent
 * Chief Financial Officer: Financial intelligence, forecasting, unit economics, fundraising, risk management
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
  FinancialReport,
  RevenueMetrics,
  CostMetrics,
  ProfitabilityMetrics,
  CashFlowMetrics,
  FinancialForecast,
  VarianceAnalysis,
} from '../shared/types';

export class CFOAgent extends BaseExecutiveAgent {
  private financialModels: Map<string, FinancialModel> = new Map();
  private forecastHorizon: number = 12; // months
  private riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate';

  constructor() {
    super('cfo');
    this.initializeFinancialModels();
  }

  protected getSystemPrompt(): string {
    return `You are the CFO of an AI-powered website audit platform. You own financial strategy, planning, analysis, and capital management.

CORE RESPONSIBILITIES:
1. Financial planning and analysis (FP&A)
2. Unit economics optimization
3. Cash flow and runway management
4. Fundraising and investor relations (with CEO)
5. Risk management and internal controls
6. Pricing strategy and monetization
7. Financial reporting and board materials
8. Capital allocation decisions

DECISION FRAMEWORK:
- Maximize long-term shareholder value, not short-term optics
- Every dollar should have a clear ROI or strategic purpose
- Maintain 18+ months of runway always
- Unit economics must work before scaling spend
- Price for value delivered, not cost-plus
- Diversify revenue streams for resilience
- Measure what matters; report with context

KEY METRICS YOU OWN:
- ARR / MRR
- Net Revenue Retention (NRR)
- Gross Margin
- CAC and LTV
- LTV:CAC Ratio
- CAC Payback Period
- Magic Number
- Burn Rate and Runway
- Rule of 40
- Free Cash Flow
- Gross Profit per Customer

FINANCIAL PHILOSOPHY:
- "Revenue is vanity, profit is sanity, cash is king"
- "Growth without unit economics is a burning house"
- "Margin is the best defense against uncertainty"
- "Forecast conservatively, plan for contingencies"`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessFinancialHealth(context),
      this.assessMarketFinancials(context),
      this.assessInitiativeROI(context),
      this.assessResourceEfficiency(context),
    ]);

    const recommendations = await this.generateFinancialRecommendations(
      businessAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    return {
      role: 'cfo',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  private async assessFinancialHealth(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const { revenue, costs, profitability, growth } = context.businessState;
    
    const healthScore = this.calculateFinancialHealthScore(context.businessState);
    
    return {
      healthScore,
      strengths: this.identifyFinancialStrengths(context.businessState),
      weaknesses: this.identifyFinancialWeaknesses(context.businessState),
      opportunities: this.identifyFinancialOpportunities(context),
      threats: this.identifyFinancialThreats(context),
      keyMetrics: {
        'ARR': { value: revenue.annualRecurring, trend: 'up', target: revenue.annualRecurring * 1.5 },
        'Net Margin': { value: profitability.netMargin, trend: profitability.netMargin > 0.15 ? 'up' : 'stable', target: 0.20 },
        'Gross Margin': { value: profitability.grossMargin, trend: 'stable', target: 0.80 },
        'CAC Payback': { value: profitability.unitEconomics.paybackPeriod, trend: profitability.unitEconomics.paybackPeriod < 12 ? 'down' : 'up', target: 12 },
        'LTV:CAC': { value: profitability.unitEconomics.ltvToCacRatio, trend: profitability.unitEconomics.ltvToCacRatio > 3 ? 'up' : 'stable', target: 5 },
        'Burn Rate': { value: profitability.ebitda < 0 ? Math.abs(profitability.ebitda) : 0, trend: 'down', target: 0 },
        'Rule of 40': { value: growth.revenueGrowthRate * 100 + profitability.netMargin * 100, trend: 'up', target: 40 },
        'Runway': { value: this.calculateRunway(context.businessState), trend: this.calculateRunway(context.businessState) > 18 ? 'up' : 'down', target: 18 },
      },
    };
  }

  private calculateFinancialHealthScore(state: BusinessState): number {
    let score = 0;
    score += Math.min(state.profitability.netMargin * 200, 25);
    score += Math.min(state.profitability.grossMargin * 30, 20);
    score += Math.min(state.profitability.unitEconomics.ltvToCacRatio * 5, 20);
    score += Math.min((1 / state.profitability.unitEconomics.paybackPeriod) * 60, 15);
    score += Math.min(this.calculateRunway(state) / 18 * 20, 20);
    return Math.round(Math.min(100, score));
  }

  private identifyFinancialStrengths(state: BusinessState): string[] {
    const strengths: string[] = [];
    if (state.profitability.grossMargin > 0.75) strengths.push('Strong gross margin');
    if (state.profitability.unitEconomics.ltvToCacRatio > 4) strengths.push('Excellent unit economics');
    if (state.profitability.unitEconomics.paybackPeriod < 12) strengths.push('Fast CAC payback');
    if (state.revenue.churnRate < 0.05) strengths.push('Low revenue churn');
    if (state.profitability.ebitda > 0) strengths.push('EBITDA positive');
    if (state.growth.revenueGrowthRate > 0.5) strengths.push('High growth rate');
    return strengths.length > 0 ? strengths : ['Building financial foundation'];
  }

  private identifyFinancialWeaknesses(state: BusinessState): string[] {
    const weaknesses: string[] = [];
    if (state.profitability.netMargin < 0.1) weaknesses.push('Low net margin');
    if (state.profitability.unitEconomics.paybackPeriod > 18) weaknesses.push('Slow CAC payback');
    if (state.profitability.unitEconomics.ltvToCacRatio < 3) weaknesses.push('LTV:CAC below target');
    if (state.revenue.churnRate > 0.1) weaknesses.push('High revenue churn');
    if (this.calculateRunway(state) < 12) weaknesses.push('Short runway - funding risk');
    if (state.profitability.ebitda < 0 && Math.abs(state.profitability.ebitda) > state.revenue.monthlyRecurring * 2) {
      weaknesses.push('Unsustainable burn rate');
    }
    return weaknesses;
  }

  private identifyFinancialOpportunities(context: ExecutiveContext): string[] {
    const opportunities: string[] = [];
    const { costs, profitability } = context.businessState;
    
    if (costs.cac > 200) opportunities.push('Optimize CAC through funnel improvements');
    if (profitability.unitEconomics.ltvToCacRatio > 4) opportunities.push('Increase growth investment - economics support it');
    if (context.businessState.revenue.churnRate > 0.05) opportunities.push('Reduce churn for 10% revenue uplift');
    if (costs.costBreakdown['infrastructure'] > 10000) opportunities.push('Optimize infrastructure spend');
    
    // Pricing opportunities
    opportunities.push('Implement usage-based pricing tier');
    opportunities.push('Add annual prepay discount (improve cash flow)');
    opportunities.push('Introduce enterprise tier with custom pricing');
    
    return opportunities;
  }

  private identifyFinancialThreats(context: ExecutiveContext): string[] {
    const threats: string[] = [];
    const { revenue, profitability } = context.businessState;
    
    if (revenue.churnRate > 0.12) threats.push('Churn rate threatens growth sustainability');
    if (profitability.ebitda < 0 && this.calculateRunway(context.businessState) < 9) threats.push('Imminent funding need');
    if (profitability.unitEconomics.ltvToCacRatio < 2.5) threats.push('Unit economics deteriorating');
    if (revenue.revenueByChannel['paid'] > revenue.annualRecurring * 0.6) threats.push('Over-reliance on paid acquisition');
    
    // Regulatory
    context.marketConditions.regulatoryEnvironment.filter(r => r.impact === 'negative').forEach(r => {
      threats.push(`Regulatory cost: ${r.regulation} ($${r.complianceCost})`);
    });
    
    return threats;
  }

  private calculateRunway(state: BusinessState): number {
    if (state.profitability.ebitda >= 0) return 999;
    const burn = Math.abs(state.profitability.ebitda);
    const cash = state.revenue.monthlyRecurring * 6; // Assume 6 months cash reserve
    return cash / burn;
  }

  private async assessMarketFinancials(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    return {
      attractiveness: Math.min(95, 60 + context.marketConditions.marketSize.growthRate * 100),
      competitivePosition: this.assessFinancialCompetitivePosition(context),
      trends: context.marketConditions.industryTrends
        .filter(t => t.impact !== 'neutral')
        .map(t => ({ trend: t.trend, impact: t.impact === 'positive' ? 0.6 : -0.4, actionable: true })),
      threats: context.marketConditions.competitorAnalysis
        .filter(c => c.threatLevel === 'high')
        .map(c => ({
          threat: `${c.competitor} pricing pressure: ${c.pricing.model}`,
          likelihood: 0.6,
          impact: c.marketShare * 50,
        })),
      opportunities: context.marketConditions.demandSignals
        .filter(s => s.actionable && s.signal.toLowerCase().includes('budget'))
        .map(s => ({ opportunity: s.signal, effort: 1 - s.strength, reward: s.strength * 100 })),
    };
  }

  private assessFinancialCompetitivePosition(context: ExecutiveContext): number {
    // Assess based on pricing power and margin
    const ourMargin = context.businessState.profitability.grossMargin;
    const avgCompetitorStrength = context.marketConditions.competitorAnalysis
      .reduce((sum, c) => sum + (c.pricing.pricePoints.length > 0 ? 70 : 50), 0) / 
      Math.max(1, context.marketConditions.competitorAnalysis.length);
    return Math.min(100, (ourMargin / avgCompetitorStrength) * 100);
  }

  private async assessInitiativeROI(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const activeInitiatives = context.activeInitiatives.filter(i => i.status === 'active');
    
    const onTrack = activeInitiatives.filter(i => i.expectedImpact.revenueIncrease / i.resources.budget >= 2);
    const atRisk = activeInitiatives.filter(i => i.expectedImpact.revenueIncrease / i.resources.budget < 2 && i.expectedImpact.revenueIncrease > 0);
    const behind = activeInitiatives.filter(i => i.expectedImpact.revenueIncrease === 0 && i.resources.budget > 0);
    const completed = context.activeInitiatives.filter(i => i.status === 'completed');
    
    const recommendedChanges: InitiativeChange[] = [];
    
    for (const initiative of activeInitiatives) {
      const roi = initiative.expectedImpact.revenueIncrease / initiative.resources.budget;
      if (roi < 1.5) {
        recommendedChanges.push({
          initiativeId: initiative.id,
          change: 'pause',
          reason: `ROI (${roi.toFixed(2)}) below 1.5x threshold - reallocate capital`,
          expectedImpact: { revenueIncrease: 0, costReduction: initiative.resources.budget, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
        });
      } else if (roi > 5) {
        recommendedChanges.push({
          initiativeId: initiative.id,
          change: 'add_resources',
          reason: `Exceptional ROI (${roi.toFixed(2)}) - double down`,
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
    
    return { onTrack, atRisk, behind, completed, recommendedChanges };
  }

  private async assessResourceEfficiency(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { budget, personnel, technology } = context.resourceAllocation;
    
    const budgetHealth = budget.available / budget.total > 0.2 ? 'healthy' : budget.available / budget.total > 0.1 ? 'tight' : 'critical';
    const personnelHealth = personnel.utilization < 0.85 ? 'healthy' : 'stretched';
    const technologyHealth = technology.computeBudget > 0 && technology.infrastructure.cloudSpend < technology.computeBudget * 0.9 ? 'healthy' : 'needs_investment';
    
    const recommendations: ResourceRecommendation[] = [];
    
    if (budgetHealth !== 'healthy') {
      recommendations.push({
        type: 'budget',
        action: 'increase',
        amount: budget.total * 0.15,
        reason: this.calculateRunway(context.businessState) < 18 ? 'Extend runway below 18 months' : 'Build buffer for growth',
        priority: 'high',
      });
    }
    
    if (this.riskTolerance === 'aggressive' && budgetHealth === 'healthy') {
      recommendations.push({
        type: 'budget',
        action: 'reallocate',
        amount: budget.byDepartment['marketing'] * 0.3,
        from: 'marketing',
        to: 'growth',
        reason: 'Aggressive growth mode - shift to highest ROI channels',
        priority: 'medium',
      });
    }
    
    return { budgetHealth, personnelHealth, technologyHealth, recommendations };
  }

  private async generateFinancialRecommendations(
    business: ExecutiveAnalysis['businessAssessment'],
    initiatives: ExecutiveAnalysis['initiativeAssessment'],
    resources: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const state = this.getContext()!.businessState;
    
    // Pricing optimization
    recommendations.push({
      id: `rec-cfo-${Date.now()}-pricing`,
      category: 'financial',
      title: 'Implement Value-Based Pricing Restructure',
      description: 'Move from flat pricing to tiered value-based pricing with usage component',
      rationale: 'Current pricing captures only 30% of value delivered; competitors charge 2-3x for similar value',
      expectedImpact: { revenueIncrease: 300000, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0.05, confidence: 0.7 },
      effort: 'medium',
      timeline: '6 weeks',
      owner: 'cfo',
      dependencies: ['cmo-positioning', 'cto-billing-system'],
      risks: ['Customer pushback', 'Migration complexity'],
      metrics: ['ARPU', 'Gross margin', 'Churn', 'Expansion revenue'],
    });
    
    // CAC optimization
    if (state.costs.cac > 150) {
      recommendations.push({
        id: `rec-cfo-${Date.now()}-cac`,
        category: 'financial',
        title: 'Reduce CAC by 30% via Funnel Optimization',
        description: 'Improve conversion at each funnel stage; shift to product-led growth',
        rationale: `CAC at $${state.costs.cac} is above target of $100; affects unit economics`,
        expectedImpact: { revenueIncrease: 0, costReduction: state.costs.cac * 0.3 * state.customerMetrics.newCustomers, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
        effort: 'medium',
        timeline: '8 weeks',
        owner: 'cfo',
        dependencies: ['cmo-funnel', 'cto-tracking'],
        risks: ['Slower top-line growth temporarily'],
        metrics: ['CAC', 'Conversion rate', 'LTV:CAC'],
      });
    }
    
    // Runway protection
    if (this.calculateRunway(state) < 18) {
      recommendations.push({
        id: `rec-cfo-${Date.now()}-runway`,
        category: 'financial',
        title: 'Extend Runway to 24+ Months',
        description: 'Cut non-essential spend, accelerate collections, raise bridge if needed',
        rationale: `Runway at ${this.calculateRunway(state).toFixed(1)} months - below 18-month safety threshold`,
        expectedImpact: { revenueIncrease: 0, costReduction: state.profitability.ebitda < 0 ? Math.abs(state.profitability.ebitda) * 0.3 : 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.9 },
        effort: 'high',
        timeline: '4 weeks',
        owner: 'cfo',
        dependencies: ['ceo-approval'],
        risks: ['Growth slowdown', 'Morale impact'],
        metrics: ['Runway', 'Burn rate', 'Cash balance'],
      });
    }
    
    // Unit economics
    recommendations.push({
      id: `rec-cfo-${Date.now()}-unit`,
      category: 'financial',
      title: 'Achieve LTV:CAC of 5:1',
      description: 'Balance growth investment with retention to reach 5:1 ratio',
      rationale: `Current LTV:CAC at ${state.profitability.unitEconomics.ltvToCacRatio.toFixed(1)} - target is 5:1 for efficient scaling`,
      expectedImpact: { revenueIncrease: 100000, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0.1, confidence: 0.75 },
      effort: 'medium',
      timeline: '90 days',
      owner: 'cfo',
      dependencies: ['cmo-retention', 'vp_customer_success'],
      risks: ['May slow growth if over-optimized'],
      metrics: ['LTV', 'CAC', 'LTV:CAC', 'Payback period'],
    });
    
    // Initiative reallocation
    for (const change of initiatives.recommendedChanges) {
      if (change.change === 'pause' || change.change === 'add_resources') {
        recommendations.push({
          id: `rec-cfo-${Date.now()}-${change.initiativeId}`,
          category: 'financial',
          title: `${change.change === 'pause' ? 'Pause' : 'Fund'} Initiative ${change.initiativeId}`,
          description: change.reason,
          rationale: 'Capital reallocation for optimal portfolio ROI',
          expectedImpact: change.expectedImpact,
          effort: 'low',
          timeline: '2 weeks',
          owner: 'cfo',
          dependencies: [],
          risks: ['Opportunity cost'],
          metrics: ['Portfolio ROI', 'Capital efficiency'],
        });
      }
    }
    
    return recommendations;
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];
    const state = this.getContext()!.businessState;
    
    // Pricing decision
    const pricingRec = analysis.recommendations.find(r => r.id.includes('pricing'));
    if (pricingRec) {
      const decision = await this.makeDecision(
        pricingRec.title,
        pricingRec.rationale,
        pricingRec.expectedImpact,
        {
          level: 'high',
          risks: pricingRec.risks.map(r => ({ risk: r, probability: 0.4, impact: 0.6, category: 'financial' })),
          mitigationStrategies: ['Grandfather existing customers', 'Phased rollout', 'Clear communication'],
          contingencyPlans: ['Revert if churn spikes >2pp', 'Offer hybrid option'],
        },
        pricingRec.dependencies.map(d => ({
          description: d,
          pros: ['Enables pricing change'],
          cons: ['Dependency delay'],
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 },
        }))
      );
      decisions.push(decision);
    }
    
    // Runway decision
    if (this.calculateRunway(state) < 18) {
      const runwayRec = analysis.recommendations.find(r => r.id.includes('runway'));
      if (runwayRec) {
        const decision = await this.makeDecision(
          runwayRec.title,
          runwayRec.rationale,
          runwayRec.expectedImpact,
          {
            level: 'critical',
            risks: [{ risk: 'Growth slowdown', probability: 0.7, impact: 0.5, category: 'financial' }, { risk: 'Team morale', probability: 0.4, impact: 0.4, category: 'strategic' }],
            mitigationStrategies: ['Transparent communication', 'Targeted cuts not across-board', 'Protect core growth'],
            contingencyPlans: ['Raise bridge round', 'Defer non-critical hires'],
          },
          []
        );
        decisions.push(decision);
      }
    }
    
    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];
    const state = this.getContext()!.businessState;
    
    // Unit economics insight
    if (state.profitability.unitEconomics.ltvToCacRatio < 3) {
      insights.push({
        id: `insight-cfo-${Date.now()}-unit`,
        category: 'financial',
        insight: `LTV:CAC at ${state.profitability.unitEconomics.ltvToCacRatio.toFixed(1)}:1 - below healthy 3:1 threshold`,
        evidence: [
          `LTV: $${state.costs.ltv}`,
          `CAC: $${state.costs.cac}`,
          `Payback: ${state.profitability.unitEconomics.paybackPeriod} months`,
        ],
        confidence: 0.9,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Reduce CAC via funnel optimization',
          'Increase LTV via upsells and retention',
          'Reallocate spend to efficient channels',
          'Consider pricing increase',
        ],
        owner: 'cfo',
      });
    }
    
    // Runway insight
    const runway = this.calculateRunway(state);
    if (runway < 18) {
      insights.push({
        id: `insight-cfo-${Date.now()}-runway`,
        category: 'financial',
        insight: `Runway at ${runway.toFixed(1)} months - below 18-month safety threshold`,
        evidence: [
          `Monthly burn: $${state.profitability.ebitda < 0 ? Math.abs(state.profitability.ebitda) : 0}`,
          `Cash reserve: ~$${state.revenue.monthlyRecurring * 6}`,
          `Break-even: ${state.profitability.unitEconomics.breakEvenPoint} customers`,
        ],
        confidence: 0.95,
        impact: 'high',
        urgency: 'this_month',
        recommendedActions: [
          'Cut non-essential spend by 20%',
          'Accelerate collections',
          'Prepare bridge round materials',
          'Defer discretionary hires',
        ],
        owner: 'cfo',
      });
    }
    
    // Margin insight
    if (state.profitability.grossMargin < 0.75) {
      insights.push({
        id: `insight-cfo-${Date.now()}-margin`,
        category: 'financial',
        insight: `Gross margin at ${(state.profitability.grossMargin * 100).toFixed(0)}% - below SaaS benchmark of 75%`,
        evidence: [
          `Gross margin: ${(state.profitability.grossMargin * 100).toFixed(0)}%`,
          `Infrastructure cost: $${state.costs.costBreakdown?.infrastructure || 0}`,
          `COGS per customer: $${(state.costs.totalMonthly / Math.max(1, state.customerMetrics.totalCustomers)).toFixed(2)}`,
        ],
        confidence: 0.85,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Optimize infrastructure (spot, caching)',
          'Improve onboarding to reduce support cost',
          'Automate customer success',
          'Review vendor contracts',
        ],
        owner: 'cfo',
      });
    }
    
    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];
    
    for (const rec of analysis.recommendations.filter(r => r.category === 'financial')) {
      actions.push({
        id: `action-cfo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title,
        description: rec.description,
        owner: rec.owner,
        priority: rec.effort === 'high' || rec.title.includes('Runway') ? 'critical' : 'high',
        dueDate: new Date(Date.now() + this.parseTimeline(rec.timeline)).toISOString().split('T')[0],
        status: 'pending',
        dependencies: rec.dependencies,
        estimatedImpact: rec.expectedImpact,
      });
    }
    
    return actions;
  }

  private parseTimeline(timeline: string): number {
    const match = timeline.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return 30 * 24 * 3600000;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('day')) return value * 24 * 3600000;
    if (unit.startsWith('week')) return value * 7 * 24 * 3600000;
    if (unit.startsWith('month')) return value * 30 * 24 * 3600000;
    return 30 * 24 * 3600000;
  }

  private initializeFinancialModels(): void {
    this.financialModels.set('saas_growth', {
      name: 'SaaS Growth Model',
      variables: ['newCustomers', 'churnRate', 'arpu', 'expansionRate'],
      formula: 'ARR = (startingCustomers * (1-churn) + newCustomers) * arpu * (1+expansion)',
      assumptions: ['Linear growth', 'Constant churn', 'No seasonality'],
    });
    
    this.financialModels.set('unit_economics', {
      name: 'Unit Economics Model',
      variables: ['cac', 'ltv', 'payback', 'grossMargin'],
      formula: 'LTV:CAC = ltv / cac; Payback = cac / (arpu * grossMargin)',
      assumptions: ['Stable retention', 'No discounting'],
    });
    
    this.financialModels.set('burn_runway', {
      name: 'Burn & Runway Model',
      variables: ['monthlyBurn', 'cashBalance', 'growthInvestment'],
      formula: 'Runway = cashBalance / (monthlyBurn - growthInvestment)',
      assumptions: ['Constant burn', 'No new funding'],
    });
  }

  async generateFinancialReport(context: ExecutiveContext): Promise<FinancialReport> {
    const { revenue, costs, profitability } = context.businessState;
    const runway = this.calculateRunway(context.businessState);
    
    return {
      revenue: { ...revenue },
      costs: { ...costs },
      profitability: { ...profitability },
      cashFlow: {
        operatingCashFlow: profitability.ebitda,
        investingCashFlow: -costs.costBreakdown['infrastructure'] || -5000,
        financingCashFlow: 0,
        netCashFlow: profitability.ebitda - (costs.costBreakdown['infrastructure'] || 5000),
        runway,
        burnRate: profitability.ebitda < 0 ? Math.abs(profitability.ebitda) : 0,
      },
      forecasts: this.generateForecasts(context),
      variances: this.generateVariances(context),
    };
  }

  private generateForecasts(context: ExecutiveContext): FinancialForecast[] {
    const { revenue, growth } = context.businessState;
    const forecasts: FinancialForecast[] = [];
    
    for (let i = 1; i <= 6; i++) {
      const period = new Date(Date.now() + i * 30 * 24 * 3600000).toISOString().slice(0, 7);
      const projectedRevenue = revenue.monthlyRecurring * Math.pow(1 + growth.revenueGrowthRate, i);
      const projectedCosts = context.businessState.costs.totalMonthly * Math.pow(1.05, i);
      forecasts.push({
        period,
        revenue: projectedRevenue,
        costs: projectedCosts,
        profit: projectedRevenue - projectedCosts,
        confidence: Math.max(0.5, 0.9 - i * 0.07),
        assumptions: ['Growth rate stable', 'No major market shifts', 'No new funding'],
      });
    }
    
    return forecasts;
  }

  private generateVariances(context: ExecutiveContext): VarianceAnalysis[] {
    const variances: VarianceAnalysis[] = [];
    const { revenue, costs } = context.businessState;
    
    // Revenue variance
    const budgetedRevenue = revenue.monthlyRecurring * 1.1;
    variances.push({
      category: 'Revenue',
      budgeted: budgetedRevenue,
      actual: revenue.monthlyRecurring,
      variance: revenue.monthlyRecurring - budgetedRevenue,
      variancePercent: (revenue.monthlyRecurring - budgetedRevenue) / budgetedRevenue * 100,
      explanation: revenue.monthlyRecurring > budgetedRevenue ? 'Outperforming plan' : 'Below plan - need acceleration',
    });
    
    // Cost variance
    const budgetedCost = costs.totalMonthly * 0.95;
    variances.push({
      category: 'Costs',
      budgeted: budgetedCost,
      actual: costs.totalMonthly,
      variance: costs.totalMonthly - budgetedCost,
      variancePercent: (costs.totalMonthly - budgetedCost) / budgetedCost * 100,
      explanation: costs.totalMonthly > budgetedCost ? 'Over budget - review vendors' : 'Under budget - good discipline',
    });
    
    return variances;
  }

  // CFO-specific methods
  getFinancialModels(): Map<string, FinancialModel> {
    return new Map(this.financialModels);
  }

  async setRiskTolerance(tolerance: 'conservative' | 'moderate' | 'aggressive'): Promise<void> {
    this.riskTolerance = tolerance;
    this.updateMemory('riskTolerance', tolerance);
  }

  getRiskTolerance(): string {
    return this.riskTolerance;
  }

  async calculateOptimalPricing(currentPricing: PricingStructure): Promise<PricingRecommendation> {
    // Simplified pricing optimization logic
    const state = this.getContext()!.businessState;
    const optimalPrice = state.costs.ltv * 0.1; // 10% of LTV as monthly
    
    return {
      currentPrice: currentPricing.basePrice,
      recommendedPrice: optimalPrice,
      rationale: `Current price captures only ${(currentPricing.basePrice / (state.costs.ltv * 0.1) * 100).toFixed(0)}% of value-based optimal`,
      expectedRevenueUplift: (optimalPrice - currentPricing.basePrice) * state.customerMetrics.totalCustomers * 12,
      confidence: 0.7,
      rolloutPlan: ['Grandfather existing', 'Announce 30 days ahead', 'Offer annual discount'],
    };
  }
}

export interface FinancialModel {
  name: string;
  variables: string[];
  formula: string;
  assumptions: string[];
}

export interface PricingStructure {
  basePrice: number;
  tiers: { name: string; price: number; features: string[] }[];
  discounts: Record<string, number>;
}

export interface PricingRecommendation {
  currentPrice: number;
  recommendedPrice: number;
  rationale: string;
  expectedRevenueUplift: number;
  confidence: number;
  rolloutPlan: string[];
}
