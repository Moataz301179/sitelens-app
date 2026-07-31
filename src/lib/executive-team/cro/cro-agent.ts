/**
 * Executive AI Team - CRO Agent
 * Chief Revenue Officer: Sales strategy, pipeline, conversion optimization, revenue operations
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
  SalesReport,
  PipelineMetrics,
  SalesPerformanceMetrics,
  SalesForecast,
  SalesActivityMetrics,
  ConversionMetrics,
} from '../shared/types';

export class CROAgent extends BaseExecutiveAgent {
  private salesPlaybook: SalesPlaybook;
  private revenueOps: RevenueOps;
  private crmSync: CRMSync;

  constructor() {
    super('cso');
    this.salesPlaybook = this.loadSalesPlaybook();
    this.revenueOps = new RevenueOps();
    this.crmSync = new CRMSync();
  }

  protected getSystemPrompt(): string {
    return `You are the CRO of an AI-powered website audit platform. You own revenue generation, sales strategy, and revenue operations.

CORE RESPONSIBILITIES:
1. Sales strategy and execution
2. Pipeline generation and management
3. Conversion optimization across funnel
4. Revenue operations (RevOps)
5. Sales team leadership and coaching
6. Pricing and packaging strategy (with CFO)
7. Partnerships and channel sales
8. Customer expansion and upsell

DECISION FRAMEWORK:
- Pipeline coverage must be 3x quota always
- Optimize for customer LTV, not just deal size
- Sales velocity = (# opportunities × win rate × ACV) / sales cycle
- Invest in channels with best CAC:LTV
- Product-led growth complements sales-led
- Every lost deal is a learning opportunity
- Forecasting accuracy is a discipline

KEY METRICS YOU OWN:
- Pipeline Value & Coverage
- Win Rate
- Average Deal Size (ACV)
- Sales Cycle Length
- Quota Attainment
- Conversion Rates (lead→opp→close)
- CAC by Channel
- Expansion Revenue
- Net Revenue Retention
- Revenue Forecast Accuracy

SALES PHILOSOPHY:
- "Sell outcomes, not features"
- "The best demo is a free audit"
- "Speed to lead wins deals"
- "Expand happy customers relentlessly"
- "Data-driven coaching improves performance"`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessSalesPerformance(context),
      this.assessMarketRevenue(context),
      this.assessSalesInitiatives(context),
      this.assessSalesResources(context),
    ]);

    const recommendations = await this.generateSalesRecommendations(
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    return {
      role: 'cso',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  private async assessSalesPerformance(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const salesReport = await this.generateSalesReport(context);
    
    return {
      healthScore: this.calculateSalesHealthScore(salesReport),
      strengths: this.identifySalesStrengths(salesReport),
      weaknesses: this.identifySalesWeaknesses(salesReport),
      opportunities: this.identifySalesOpportunities(context, salesReport),
      threats: this.identifySalesThreats(context, salesReport),
      keyMetrics: {
        'Pipeline Coverage': { value: salesReport.pipeline.weightedValue / (context.businessState.revenue.monthlyRecurring * 3), trend: 'up', target: 3 },
        'Win Rate': { value: salesReport.performance.winRate * 100, trend: salesReport.performance.winRate > 0.25 ? 'up' : 'down', target: 30 },
        'Avg Deal Size': { value: salesReport.pipeline.avgDealSize, trend: 'up', target: 5000 },
        'Sales Cycle': { value: salesReport.pipeline.salesCycleLength, trend: salesReport.pipeline.salesCycleLength < 30 ? 'down' : 'up', target: 30 },
        'Quota Attainment': { value: salesReport.performance.quotaAttainment * 100, trend: salesReport.performance.quotaAttainment > 0.8 ? 'up' : 'down', target: 100 },
        'Conversion Rate': { value: salesReport.conversion.overallConversion * 100, trend: 'up', target: 3 },
        'Expansion Rev': { value: context.businessState.growth.expansionRevenue, trend: 'up', target: context.businessState.revenue.annualRecurring * 0.2 },
        'NRR': { value: this.calculateNRR(context), trend: this.calculateNRR(context) > 1.1 ? 'up' : 'stable', target: 1.2 },
      },
    };
  }

  private calculateSalesHealthScore(report: SalesReport): number {
    let score = 0;
    score += Math.min(report.performance.quotaAttainment * 30, 30);
    score += Math.min(report.performance.winRate * 100, 20);
    score += Math.min(report.pipeline.weightedValue / (report.pipeline.totalValue) * 20, 20);
    score += Math.min((30 / Math.max(1, report.pipeline.salesCycleLength)) * 20, 15);
    score += Math.min(report.conversion.overallConversion * 500, 15);
    return Math.round(Math.min(100, score));
  }

  private identifySalesStrengths(report: SalesReport): string[] {
    const strengths: string[] = [];
    if (report.performance.quotaAttainment > 0.9) strengths.push('Strong quota attainment');
    if (report.performance.winRate > 0.3) strengths.push('High win rate');
    if (report.pipeline.weightedValue / report.pipeline.totalValue > 0.4) strengths.push('Healthy pipeline quality');
    if (report.pipeline.salesCycleLength < 30) strengths.push('Fast sales cycle');
    if (report.conversion.overallConversion > 0.03) strengths.push('Good conversion rate');
    return strengths.length > 0 ? strengths : ['Building sales foundation'];
  }

  private identifySalesWeaknesses(report: SalesReport): string[] {
    const weaknesses: string[] = [];
    if (report.performance.quotaAttainment < 0.7) weaknesses.push('Low quota attainment');
    if (report.performance.winRate < 0.2) weaknesses.push('Low win rate');
    if (report.pipeline.weightedValue / report.pipeline.totalValue < 0.3) weaknesses.push('Poor pipeline quality');
    if (report.pipeline.salesCycleLength > 45) weaknesses.push('Long sales cycle');
    if (report.conversion.overallConversion < 0.02) weaknesses.push('Low conversion rate');
    return weaknesses;
  }

  private identifySalesOpportunities(context: ExecutiveContext, report: SalesReport): string[] {
    const opportunities: string[] = [];
    
    opportunities.push('Deploy audit-as-lead-magnet at scale');
    opportunities.push('Build self-serve to sales-assisted motion');
    opportunities.push('Create partner/channel program');
    
    if (report.conversion.leadToOpportunity < 0.15) {
      opportunities.push('Improve lead-to-opportunity conversion with SDR automation');
    }
    if (report.performance.winRate < 0.25) {
      opportunities.push('Improve win rate with competitive battlecards');
    }
    if (context.businessState.growth.expansionRevenue < context.businessState.revenue.annualRecurring * 0.15) {
      opportunities.push('Launch customer expansion playbook');
    }
    
    return opportunities;
  }

  private identifySalesThreats(context: ExecutiveContext, report: SalesReport): string[] {
    const threats: string[] = [];
    if (report.pipeline.weightedValue < context.businessState.revenue.monthlyRecurring * 3) {
      threats.push('Insufficient pipeline coverage (<3x)');
    }
    if (report.performance.quotaAttainment < 0.6) threats.push('Quota attainment crisis');
    if (report.conversion.overallConversion < 0.015) threats.push('Conversion funnel leaking');
    context.marketConditions.competitorAnalysis
      .filter(c => c.threatLevel === 'high')
      .forEach(c => threats.push(`${c.competitor} competitive displacement risk`));
    return threats;
  }

  private calculateNRR(context: ExecutiveContext): number {
    const { customerMetrics, revenue } = context.businessState;
    if (customerMetrics.totalCustomers === 0) return 1;
    return (customerMetrics.newCustomers - customerMetrics.churnedCustomers) / customerMetrics.totalCustomers + 1;
  }

  private async assessMarketRevenue(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    return {
      attractiveness: 80,
      competitivePosition: this.assessSalesCompetitivePosition(context),
      trends: context.marketConditions.industryTrends
        .filter(t => this.isRevenueTrend(t.trend))
        .map(t => ({ trend: t.trend, impact: t.impact === 'positive' ? 0.7 : -0.5, actionable: true })),
      threats: context.marketConditions.competitorAnalysis
        .filter(c => c.threatLevel === 'high')
        .map(c => ({ threat: `${c.competitor} aggressive pricing`, likelihood: 0.6, impact: c.marketShare * 50 })),
      opportunities: context.marketConditions.demandSignals
        .filter(s => s.actionable)
        .map(s => ({ opportunity: s.signal, effort: 1 - s.strength, reward: s.strength * 100 })),
    };
  }

  private isRevenueTrend(trend: string): boolean {
    const rev = ['saas', 'subscription', 'b2b', 'enterprise', 'conversion', 'funnel', 'pipeline'];
    return rev.some(k => trend.toLowerCase().includes(k));
  }

  private assessSalesCompetitivePosition(context: ExecutiveContext): number {
    const ourWinRate = context.activeInitiatives.length > 0 ? 0.28 : 0.25;
    return Math.min(100, ourWinRate * 300);
  }

  private async assessSalesInitiatives(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const salesInitiatives = context.activeInitiatives.filter(i => 
      i.owner === 'cso' || i.owner === 'vp_sales' || i.name.toLowerCase().includes('sales')
    );
    
    const onTrack = salesInitiatives.filter(i => i.status === 'active' && this.isOnTrack(i));
    const atRisk = salesInitiatives.filter(i => i.status === 'active' && !this.isOnTrack(i) && !this.isBehind(i));
    const behind = salesInitiatives.filter(i => this.isBehind(i));
    const completed = salesInitiatives.filter(i => i.status === 'completed');
    
    const recommendedChanges: InitiativeChange[] = [];
    for (const initiative of salesInitiatives) {
      if (initiative.status === 'active') {
        const roi = initiative.expectedImpact.revenueIncrease / initiative.resources.budget;
        if (roi < 3) {
          recommendedChanges.push({
            initiativeId: initiative.id,
            change: 'pause',
            reason: `Sales ROI (${roi.toFixed(2)}) below 3x threshold`,
            expectedImpact: { revenueIncrease: 0, costReduction: initiative.resources.budget, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
          });
        }
      }
    }
    
    return { onTrack, atRisk, behind, completed, recommendedChanges };
  }

  private isOnTrack(initiative: Initiative): boolean {
    return initiative.status === 'active' && !initiative.timeline.milestones.some(m => m.status === 'delayed');
  }

  private isBehind(initiative: Initiative): boolean {
    return initiative.timeline.milestones.some(m => m.status === 'delayed');
  }

  private async assessSalesResources(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { budget, personnel } = context.resourceAllocation;
    const salesBudget = budget.byDepartment['sales'] || 0;
    
    const budgetHealth = salesBudget > 8000 ? 'healthy' : salesBudget > 4000 ? 'tight' : 'critical';
    const personnelHealth = (personnel.byRole['sales'] || 0) >= 2 ? 'healthy' : 'stretched';
    
    return {
      budgetHealth,
      personnelHealth,
      technologyHealth: 'healthy',
      recommendations: [
        {
          type: 'budget',
          action: budgetHealth !== 'healthy' ? 'increase' : 'reallocate',
          amount: 8000,
          reason: 'Sales capacity needed for pipeline conversion',
          priority: budgetHealth === 'critical' ? 'high' : 'medium',
        },
        {
          type: 'personnel',
          action: personnelHealth === 'stretched' ? 'increase' : 'reallocate',
          amount: 2,
          reason: 'Add AEs for pipeline coverage',
          priority: 'high',
        },
      ],
    };
  }

  private async generateSalesRecommendations(
    business: ExecutiveAnalysis['businessAssessment'],
    market: ExecutiveAnalysis['marketAssessment'],
    initiatives: ExecutiveAnalysis['initiativeAssessment'],
    resources: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Audit-as-lead-magnet
    recommendations.push({
      id: `rec-cro-${Date.now()}-audit`,
      category: 'sales',
      title: 'Deploy Audit-as-Lead-Magnet Engine',
      description: 'Turn every audit into a personalized sales conversation with auto-follow-up sequences',
      rationale: 'Free audit is the perfect top-of-funnel. Automating follow-up = 3x conversion.',
      expectedImpact: { revenueIncrease: 180000, costReduction: 0, customerAcquisition: 75, retentionImprovement: 0, confidence: 0.85 },
      effort: 'medium',
      timeline: '4 weeks',
      owner: 'cso',
      dependencies: ['cmo-content', 'cto-api'],
      risks: ['Follow-up fatigue', 'Spam complaints'],
      metrics: ['Lead→opp conversion', 'Meetings booked', 'Pipeline $'],
    });
    
    // SDR automation
    recommendations.push({
      id: `rec-cro-${Date.now()}-sdr`,
      category: 'sales',
      title: 'Build SDR Automation Stack',
      description: 'Automate lead research, personalized outreach, and meeting scheduling',
      rationale: 'SDRs spend 60% time on non-selling tasks. Automation = 2x outreach volume.',
      expectedImpact: { revenueIncrease: 120000, costReduction: 15000, customerAcquisition: 50, retentionImprovement: 0, confidence: 0.75 },
      effort: 'medium',
      timeline: '6 weeks',
      owner: 'cso',
      dependencies: ['cto-tooling'],
      risks: ['Deliverability', 'Personalization quality'],
      metrics: ['Outreach volume', 'Response rate', 'Meetings booked'],
    });
    
    // Expansion playbook
    recommendations.push({
      id: `rec-cro-${Date.now()}-expansion`,
      category: 'sales',
      title: 'Customer Expansion Playbook',
      description: 'Automated upsell/cross-sell triggers based on usage and audit insights',
      rationale: 'Expansion is cheapest revenue. Happy audit customers = easy upsell.',
      expectedImpact: { revenueIncrease: 200000, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0.05, confidence: 0.8 },
      effort: 'medium',
      timeline: '8 weeks',
      owner: 'cso',
      dependencies: ['cto-usage-data', 'vp_customer_success'],
      risks: ['Over-promotion', 'Churn from pushiness'],
      metrics: ['Expansion revenue', 'NRR', 'Expansion rate'],
    });
    
    // Pipeline coverage
    const context = this.getContext()!;
    if (context.businessState.revenue.monthlyRecurring * 3 > 0) {
      recommendations.push({
        id: `rec-cro-${Date.now()}-pipeline`,
        category: 'sales',
        title: 'Achieve 3x Pipeline Coverage',
        description: 'Build pipeline to 3x monthly quota via multi-channel demand gen',
        rationale: 'Current coverage below 3x - revenue risk. Need buffer for volatility.',
        expectedImpact: { revenueIncrease: 90000, costReduction: 0, customerAcquisition: 30, retentionImprovement: 0, confidence: 0.7 },
        effort: 'high',
        timeline: '90 days',
        owner: 'cso',
        dependencies: ['cmo-demand-gen', 'sdr-automation'],
        risks: ['Lead quality', 'Sales capacity'],
        metrics: ['Pipeline coverage', 'Weighted pipeline', 'Forecast accuracy'],
      });
    }
    
    return recommendations;
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];
    
    const auditRec = analysis.recommendations.find(r => r.id.includes('audit'));
    if (auditRec) {
      decisions.push(await this.makeDecision(
        auditRec.title,
        auditRec.rationale,
        auditRec.expectedImpact,
        {
          level: 'high',
          risks: auditRec.risks.map(r => ({ risk: r, probability: 0.3, impact: 0.5, category: 'operational' })),
          mitigationStrategies: ['Segment by fit', 'Respect frequency caps', 'A/B test messaging'],
          contingencyPlans: ['Reduce frequency', 'Switch to nurture only'],
        },
        auditRec.dependencies.map(d => ({
          description: d,
          pros: ['Enables lead gen'],
          cons: ['Dependency'],
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 },
        }))
      ));
    }
    
    const expansionRec = analysis.recommendations.find(r => r.id.includes('expansion'));
    if (expansionRec) {
      decisions.push(await this.makeDecision(
        expansionRec.title,
        expansionRec.rationale,
        expansionRec.expectedImpact,
        {
          level: 'medium',
          risks: expansionRec.risks.map(r => ({ risk: r, probability: 0.3, impact: 0.4, category: 'operational' })),
          mitigationStrategies: ['Usage-based triggers', 'Soft-touch outreach', 'Opt-out easy'],
          contingencyPlans: ['Pause if NRR drops', 'Reduce frequency'],
        },
        []
      ));
    }
    
    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];
    const report = await this.generateSalesReport(this.getContext()!);
    const context = this.getContext()!;
    
    // Pipeline coverage insight
    const coverage = report.pipeline.weightedValue / (context.businessState.revenue.monthlyRecurring * 3 || 1);
    if (coverage < 3) {
      insights.push({
        id: `insight-cro-${Date.now()}-pipeline`,
        category: 'customer',
        insight: `Pipeline coverage at ${coverage.toFixed(1)}x - below 3x safety threshold`,
        evidence: [
          `Weighted pipeline: $${report.pipeline.weightedValue.toLocaleString()}`,
          `Monthly target: $${(context.businessState.revenue.monthlyRecurring * 3).toLocaleString()}`,
          `Gap: $${(context.businessState.revenue.monthlyRecurring * 3 - report.pipeline.weightedValue).toLocaleString()}`,
        ],
        confidence: 0.9,
        impact: 'high',
        urgency: 'this_month',
        recommendedActions: [
          'Launch audit lead-magnet campaign',
          'Accelerate SDR outreach',
          'Partner channel activation',
          'Webinar + demo series',
        ],
        owner: 'cso',
      });
    }
    
    // Win rate insight
    if (report.performance.winRate < 0.25) {
      insights.push({
        id: `insight-cro-${Date.now()}-winrate`,
        category: 'customer',
        insight: `Win rate at ${(report.performance.winRate * 100).toFixed(0)}% - below 25% benchmark`,
        evidence: [
          `Win rate: ${(report.performance.winRate * 100).toFixed(0)}%`,
          `Avg deal size: $${report.pipeline.avgDealSize}`,
          `Sales cycle: ${report.pipeline.salesCycleLength} days`,
        ],
        confidence: 0.85,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Build competitive battlecards',
          'Improve discovery questions',
          'Qualify harder upfront',
          'Sales coaching on top objections',
        ],
        owner: 'cso',
      });
    }
    
    // Expansion insight
    const nrr = this.calculateNRR(context);
    if (nrr < 1.1) {
      insights.push({
        id: `insight-cro-${Date.now()}-nrr`,
        category: 'customer',
        insight: `Net Revenue Retention at ${(nrr * 100).toFixed(0)}% - below 110% expansion target`,
        evidence: [
          `NRR: ${(nrr * 100).toFixed(0)}%`,
          `Expansion revenue: $${context.businessState.growth.expansionRevenue}`,
          `Churned: ${context.businessState.customerMetrics.churnedCustomers}`,
        ],
        confidence: 0.8,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Launch expansion playbook',
          'Usage-based upsell triggers',
          'Quarterly business reviews',
          'Feature adoption campaigns',
        ],
        owner: 'cso',
      });
    }
    
    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];
    
    for (const rec of analysis.recommendations.filter(r => r.category === 'sales')) {
      actions.push({
        id: `action-cro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title,
        description: rec.description,
        owner: rec.owner,
        priority: rec.effort === 'high' ? 'high' : 'medium',
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

  private loadSalesPlaybook(): SalesPlaybook {
    return {
      stages: ['lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed'],
      conversionTargets: { lead: 0.2, qualified: 0.4, demo: 0.5, proposal: 0.6, negotiation: 0.7 },
      cadence: ['Day 0: Thank you + audit summary', 'Day 1: Case study', 'Day 3: Demo offer', 'Day 7: Follow-up', 'Day 14: Last chance'],
      objectionHandlers: {
        'too expensive': 'Show ROI from audit findings',
        'no time': '5-min audit walkthrough',
        'competitor': 'Comparison: audit accuracy + automation',
      },
    };
  }

  private async generateSalesReport(context: ExecutiveContext): Promise<SalesReport> {
    return {
      pipeline: {
        totalValue: 450000,
        weightedValue: 180000,
        byStage: {
          lead: { name: 'Lead', count: 120, value: 60000, weightedValue: 12000, conversionRate: 0.2, avgDaysInStage: 5 },
          qualified: { name: 'Qualified', count: 45, value: 180000, weightedValue: 72000, conversionRate: 0.4, avgDaysInStage: 7 },
          demo: { name: 'Demo', count: 20, value: 120000, weightedValue: 60000, conversionRate: 0.5, avgDaysInStage: 10 },
          proposal: { name: 'Proposal', count: 8, value: 60000, weightedValue: 36000, conversionRate: 0.6, avgDaysInStage: 12 },
          negotiation: { name: 'Negotiation', count: 4, value: 30000, weightedValue: 21000, conversionRate: 0.7, avgDaysInStage: 8 },
        },
        newOpportunities: 65,
        closedWon: 18,
        closedLost: 12,
        avgDealSize: 4200,
        salesCycleLength: 32,
      },
      performance: {
        quotaAttainment: 0.88,
        avgQuotaAttainment: 0.82,
        topPerformers: [{ rep: 'AE1', quota: 50000, attainment: 1.2, dealsClosed: 12, pipelineGenerated: 180000, activities: 450 }],
        activitiesPerRep: 85,
        winRate: 0.28,
        avgDealSize: 4200,
      },
      forecasting: [
        { period: '2026-08', commit: 90000, bestCase: 120000, worstCase: 70000, confidence: 0.8, methodology: 'Weighted pipeline' },
        { period: '2026-09', commit: 110000, bestCase: 150000, worstCase: 85000, confidence: 0.7, methodology: 'Pipeline + SDR output' },
      ],
      activities: {
        calls: 1200,
        emails: 3400,
        meetings: 180,
        demos: 95,
        proposals: 42,
        byRep: { AE1: { calls: 400, emails: 1200, meetings: 60, demos: 32, proposals: 15 } },
      },
      conversion: {
        leadToOpportunity: 0.18,
        opportunityToClose: 0.28,
        overallConversion: 0.025,
        bySource: { audit: 0.04, paid: 0.02, organic: 0.03, referral: 0.06 },
        bySegment: { smb: 0.03, mid: 0.025, enterprise: 0.02 },
        timeToConvert: 28,
      },
    };
  }
}

// Supporting classes and types
export class RevenueOps {
  calculatePipelineVelocity(pipeline: PipelineMetrics): number {
    const opportunities = pipeline.totalValue / pipeline.avgDealSize;
    return (opportunities * pipeline.weightedValue / pipeline.totalValue * pipeline.avgDealSize) / pipeline.salesCycleLength;
  }

  calculateForecastAccuracy(forecast: number, actual: number): number {
    if (actual === 0) return 0;
    return 1 - Math.abs(forecast - actual) / actual;
  }
}

export class CRMSync {
  async syncOpportunity(opp: Record<string, unknown>): Promise<boolean> {
    // In production: sync to CRM (Salesforce, HubSpot)
    return true;
  }

  async getPipeline(): Promise<Record<string, unknown>> {
    return {};
  }
}

export interface SalesPlaybook {
  stages: string[];
  conversionTargets: Record<string, number>;
  cadence: string[];
  objectionHandlers: Record<string, string>;
}
