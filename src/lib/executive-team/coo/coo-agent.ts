/**
 * Executive AI Team - COO Agent
 * Chief Operating Officer: Operational excellence, process optimization, cross-functional coordination, execution
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
  DailyReport,
  OperationsReport,
  SystemHealthMetrics,
  AuditVolumeMetrics,
  TeamPerformanceMetrics,
  ProcessEfficiencyMetrics,
  Incident,
  Opportunity,
  OpportunityType,
  ValidationResult,
  ValidationTest,
} from '../shared/types';
import { executiveState } from '../shared/executive-state';

export class COOAgent extends BaseExecutiveAgent {
  private operationalPlaybooks: Map<string, OperationalPlaybook> = new Map();
  private processMetrics: ProcessMetrics | null = null;

  constructor() {
    super('coo');
    this.initializePlaybooks();
  }

  protected getSystemPrompt(): string {
    return `You are the COO of an AI-powered website audit platform. You own operational excellence, process optimization, and cross-functional execution.

CORE RESPONSIBILITIES:
1. Drive operational efficiency across all functions
2. Design and optimize business processes
3. Coordinate cross-functional initiatives
4. Manage vendor relationships and procurement
5. Ensure system reliability and scalability
6. Build and maintain operational playbooks
7. Monitor and improve team productivity
8. Crisis management and incident response

DECISION FRAMEWORK:
- Optimize for throughput and quality simultaneously
- Automate repetitive tasks ruthlessly
- Build scalable processes before they're needed
- Measure everything that matters
- Empower teams with clear ownership
- Create feedback loops for continuous improvement
- Plan for 10x growth in every process

KEY METRICS YOU OWN:
- System Uptime / Reliability
- Audit Processing Throughput
- Average Audit Completion Time
- Cost per Audit
- Team Utilization Rate
- Process Automation Rate
- Incident Response Time
- Customer Onboarding Time
- Operational Cost as % of Revenue

OPERATIONAL PHILOSOPHY:
- "Processes should serve people, not the other way around"
- "If you can't measure it, you can't improve it"
- "Automate the routine, humanize the exceptional"
- "Cross-functional collaboration is a competitive advantage"`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);
    this.syncMemory();

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessBusinessOperations(context),
      this.assessMarketOperations(context),
      this.assessInitiativeExecution(context),
      this.assessResourceOperations(context),
    ]);

    const recommendations = await this.generateOperationalRecommendations(
      businessAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    // Validate and fold in the business-model opportunities the Intelligence
    // Officer published to the shared brain (affiliate / dropship / shipping).
    const validated = this.getValidatedOpportunities();
    for (const { opp, validation } of validated) {
      recommendations.push({
        id: `rec-coo-${opp.id}`,
        category: 'strategic',
        title: `Execute validated opportunity: ${opp.title}`,
        description: `${opp.description} Validation score ${validation.score}/100 — ${validation.passed ? 'PASSED' : 'NOT PASSED'}, so ${validation.passed ? 'proceed to pilot' : 'hold pending further validation'}.`,
        rationale: `Sourced by Intelligence Officer; business-logic + validation gate run by COO. Est. value $${opp.estimatedValue}/mo.`,
        expectedImpact: {
          revenueIncrease: opp.estimatedValue / 200000,
          costReduction: 0.01,
          customerAcquisition: 0,
          retentionImprovement: 0.02,
          confidence: validation.score / 100,
        },
        effort: opp.type === 'affiliate' ? 'low' : 'medium',
        timeline: '45d',
        owner: 'coo',
        dependencies: ['CFO P&L sign-off', 'Legal/compliance review'],
        risks: opp.risks,
        metrics: ['opportunity_revenue_contribution', 'validation_score'],
        priority: validation.passed ? 'high' : 'low',
      });
    }

    return {
      role: 'coo',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  private async assessBusinessOperations(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const opsReport = await this.generateOperationsReport(context);
    
    const healthScore = this.calculateOperationalHealthScore(opsReport);
    
    return {
      healthScore,
      strengths: this.identifyOperationalStrengths(opsReport),
      weaknesses: this.identifyOperationalWeaknesses(opsReport),
      opportunities: this.identifyOperationalOpportunities(context),
      threats: this.identifyOperationalThreats(opsReport),
      keyMetrics: {
        'System Uptime': { value: opsReport.systemHealth.uptime, trend: opsReport.systemHealth.uptime > 99.9 ? 'up' : 'stable', target: 99.99 },
        'Avg Audit Time': { value: opsReport.auditVolume.avgAuditTime, trend: opsReport.auditVolume.avgAuditTime < 30 ? 'down' : 'up', target: 30 }, // seconds
        'Cost per Audit': { value: opsReport.auditVolume.revenueFromAudits / opsReport.auditVolume.totalAudits || 0, trend: 'stable', target: 0.50 },
        'Automation Rate': { value: opsReport.processEfficiency.automationRate, trend: opsReport.processEfficiency.automationRate > 0.8 ? 'up' : 'stable', target: 0.9 },
        'Team Utilization': { value: opsReport.teamPerformance.utilization, trend: opsReport.teamPerformance.utilization > 0.7 ? 'stable' : 'up', target: 0.8 },
        'Incident Response': { value: opsReport.incidents.length, trend: opsReport.incidents.length === 0 ? 'down' : 'up', target: 0 },
      },
    };
  }

  private async assessMarketOperations(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    // COO focuses on operational implications of market conditions
    const threats = context.marketConditions.competitorAnalysis
      .filter(c => c.threatLevel === 'high')
      .map(c => ({ 
        threat: `Competitor ${c.competitor} operational advantage: ${c.strengths.join(', ')}`, 
        likelihood: 0.7, 
        impact: 0.8 
      }));

    return {
      attractiveness: 75,
      competitivePosition: 70,
      trends: context.marketConditions.industryTrends
        .filter(t => t.impact !== 'neutral')
        .map(t => ({ trend: t.trend, impact: t.impact === 'positive' ? 0.7 : -0.5, actionable: true })),
      threats,
      opportunities: context.marketConditions.demandSignals
        .filter(s => s.actionable)
        .map(s => ({ opportunity: s.signal, effort: 0.5, reward: s.strength })),
    };
  }

  private async assessInitiativeExecution(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const activeInitiatives = context.activeInitiatives.filter(i => i.status === 'active');
    const planningInitiatives = context.activeInitiatives.filter(i => i.status === 'planning');

    const onTrack = activeInitiatives.filter(i => this.isInitiativeOnTrack(i));
    const atRisk = activeInitiatives.filter(i => !this.isInitiativeOnTrack(i) && !this.isInitiativeBehind(i));
    const behind = activeInitiatives.filter(i => this.isInitiativeBehind(i));

    const recommendedChanges = await this.generateInitiativeChanges(activeInitiatives);

    return {
      onTrack,
      atRisk,
      behind,
      completed: context.activeInitiatives.filter(i => i.status === 'completed'),
      recommendedChanges,
    };
  }

  private isInitiativeOnTrack(initiative: Initiative): boolean {
    if (!initiative.timeline.milestones.length) return true;
    const completedMilestones = initiative.timeline.milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = initiative.timeline.milestones.length;
    const expectedProgress = this.calculateExpectedProgress(initiative);
    return (completedMilestones / totalMilestones) >= expectedProgress * 0.9;
  }

  private isInitiativeBehind(initiative: Initiative): boolean {
    if (!initiative.timeline.milestones.length) return false;
    const completedMilestones = initiative.timeline.milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = initiative.timeline.milestones.length;
    const expectedProgress = this.calculateExpectedProgress(initiative);
    return (completedMilestones / totalMilestones) < expectedProgress * 0.7;
  }

  private calculateExpectedProgress(initiative: Initiative): number {
    const now = new Date();
    const start = new Date(initiative.timeline.startDate);
    const end = new Date(initiative.timeline.targetEndDate);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(1, Math.max(0, elapsed / total));
  }

  private async generateInitiativeChanges(initiatives: Initiative[]): Promise<InitiativeChange[]> {
    const changes: InitiativeChange[] = [];
    
    for (const initiative of initiatives) {
      if (this.isInitiativeBehind(initiative)) {
        changes.push({
          initiativeId: initiative.id,
          change: 'add_resources',
          reason: 'Initiative behind schedule - needs additional resources',
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.7 },
        });
      } else if (this.isInitiativeOnTrack(initiative) && initiative.priority > 8) {
        changes.push({
          initiativeId: initiative.id,
          change: 'accelerate',
          reason: 'High-priority initiative on track - accelerate for greater impact',
          expectedImpact: { revenueIncrease: initiative.expectedImpact.revenueIncrease * 0.2, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.6 },
        });
      }
    }

    return changes;
  }

  private async assessResourceOperations(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { budget, personnel, technology } = context.resourceAllocation;

    const budgetHealth = budget.available / budget.total > 0.2 ? 'healthy' : budget.available / budget.total > 0.1 ? 'tight' : 'critical';
    const personnelHealth = personnel.utilization < 0.8 ? 'healthy' : personnel.utilization < 0.95 ? 'stretched' : 'overloaded';
    const technologyHealth = technology.infrastructure.cloudSpend / (technology.computeBudget + technology.apiBudget) < 0.8 ? 'healthy' : 'needs_investment';

    return {
      budgetHealth,
      personnelHealth,
      technologyHealth,
      recommendations: [
        {
          type: 'budget',
          action: budgetHealth === 'critical' ? 'increase' : 'reallocate',
          amount: budget.total * 0.1,
          reason: 'Ensure 20% budget buffer for opportunities',
          priority: budgetHealth === 'critical' ? 'high' : 'medium',
        },
        {
          type: 'personnel',
          action: personnelHealth === 'overloaded' ? 'increase' : 'reallocate',
          amount: personnelHealth === 'overloaded' ? 2 : 0,
          reason: personnelHealth === 'overloaded' ? 'Team overloaded - hire 2 operators' : 'Optimize team allocation',
          priority: personnelHealth === 'overloaded' ? 'high' : 'low',
        },
        {
          type: 'technology',
          action: technologyHealth === 'needs_investment' ? 'increase' : 'reallocate',
          amount: technology.computeBudget * 0.2,
          reason: 'Invest in automation infrastructure',
          priority: 'medium',
        },
      ],
    };
  }

  private async generateOperationalRecommendations(
    businessAssessment: ExecutiveAnalysis['businessAssessment'],
    initiativeAssessment: ExecutiveAnalysis['initiativeAssessment'],
    resourceAssessment: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Automation opportunities
    if (businessAssessment.keyMetrics['Automation Rate'].value < 0.8) {
      recommendations.push({
        id: `rec-coo-${Date.now()}-automation`,
        category: 'operational',
        title: 'Increase Process Automation Rate',
        description: 'Current automation rate below target. Identify and automate top 5 manual processes.',
        rationale: 'Automation reduces cost per audit, improves consistency, and frees team for high-value work.',
        expectedImpact: { revenueIncrease: 0, costReduction: 15000, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
        effort: 'medium',
        timeline: '6 weeks',
        owner: 'coo',
        dependencies: ['Engineering capacity', 'Process documentation'],
        risks: ['Initial development time', 'Change management'],
        metrics: ['Automation rate', 'Cost per audit', 'Team utilization'],
      });
    }

    // System reliability
    if (businessAssessment.keyMetrics['System Uptime'].value < 99.95) {
      recommendations.push({
        id: `rec-coo-${Date.now()}-reliability`,
        category: 'operational',
        title: 'Improve System Reliability',
        description: 'Implement enhanced monitoring, auto-scaling, and disaster recovery.',
        rationale: 'System downtime directly impacts revenue and customer trust.',
        expectedImpact: { revenueIncrease: 5000, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0.02, confidence: 0.85 },
        effort: 'high',
        timeline: '8 weeks',
        owner: 'coo',
        dependencies: ['Engineering', 'Infrastructure budget'],
        risks: ['Complexity', 'Cost'],
        metrics: ['Uptime', 'MTTR', 'Customer complaints'],
      });
    }

    // Initiative execution
    if (initiativeAssessment.atRisk.length > 0 || initiativeAssessment.behind.length > 0) {
      recommendations.push({
        id: `rec-coo-${Date.now()}-execution`,
        category: 'operational',
        title: 'Accelerate At-Risk Initiatives',
        description: `Add resources to ${initiativeAssessment.atRisk.length + initiativeAssessment.behind.length} at-risk/behind initiatives.`,
        rationale: 'Strategic initiatives delayed = lost revenue and competitive disadvantage.',
        expectedImpact: { revenueIncrease: 25000, costReduction: 0, customerAcquisition: 5, retentionImprovement: 0, confidence: 0.7 },
        effort: 'medium',
        timeline: '4 weeks',
        owner: 'coo',
        dependencies: ['Budget approval', 'Resource availability'],
        risks: ['Brooks law - adding people to late project'],
        metrics: ['Initiative on-time delivery', 'Resource utilization'],
      });
    }

    // Cross-functional coordination
    recommendations.push({
      id: `rec-coo-${Date.now()}-coordination`,
      category: 'operational',
      title: 'Implement Weekly Executive Sync Process',
      description: 'Structured 30-min weekly sync with all executives for alignment and blocker removal.',
      rationale: 'Cross-functional misalignment is the #1 cause of execution delays.',
      expectedImpact: { revenueIncrease: 10000, costReduction: 5000, customerAcquisition: 0, retentionImprovement: 0.01, confidence: 0.9 },
      effort: 'low',
      timeline: '1 week',
      owner: 'coo',
      dependencies: ['Calendar coordination'],
      risks: ['Meeting fatigue'],
      metrics: ['Blockers resolved per week', 'Cross-team dependencies', 'Decision velocity'],
    });

    return recommendations;
  }

  /**
   * Read the business-model opportunities published by the Intelligence Officer
   * from the shared brain and validate each with a business-logic + test gate.
   */
  private getValidatedOpportunities(): { opp: Opportunity; validation: ValidationResult }[] {
    const opps = executiveState.recall<Opportunity[]>('opportunities') ?? [];
    return opps.map((opp) => ({ opp, validation: this.validateOpportunity(opp) }));
  }

  /**
   * Business-logic + validation testing gate. An opportunity is only "passed"
   * if its applicability and minimum economic value clear the bar AND the
   * type-specific validation tests pass. Nothing proceeds to execution until
   * this returns passed=true.
   */
  validateOpportunity(opp: Opportunity): ValidationResult {
    const tests: ValidationTest[] = [];

    // 1) Applicability threshold
    tests.push({
      name: 'applicability_threshold',
      status: opp.applicability >= 0.5 ? 'pass' : 'fail',
      detail: `Applicability ${Math.round(opp.applicability * 100)}% (min 50%)`,
    });

    // 2) Minimum economic value
    tests.push({
      name: 'minimum_value',
      status: opp.estimatedValue >= 1000 ? 'pass' : 'fail',
      detail: `Est. value $${opp.estimatedValue}/mo (min $1000)`,
    });

    // 3) Risk appetite
    tests.push({
      name: 'risk_appetite',
      status: opp.risks.length <= 3 ? 'pass' : 'fail',
      detail: `${opp.risks.length} identified risks (max 3 for auto-pass)`,
    });

    // 4) Type-specific validation test
    const typeTest: Record<OpportunityType, { status: 'pass' | 'fail' | 'pending'; detail: string }> = {
      affiliate: { status: 'pass', detail: 'Tracking + payout infrastructure assumed available' },
      dropship: { status: 'pending', detail: 'Requires supplier vetting before pilot' },
      shipping: { status: 'pass', detail: 'Fulfillment partner SLAs to be confirmed' },
      partnership: { status: 'pending', detail: 'Requires partner identification' },
      other: { status: 'pending', detail: 'Manual review required' },
    };
    tests.push({ name: `type_${opp.type}_validation`, ...typeTest[opp.type] });

    const passedTests = tests.filter((t) => t.status === 'pass').length;
    const score = Math.round((passedTests / tests.length) * 100);
    const passed = tests.filter((t) => t.status === 'fail').length === 0;

    return { passed, score, tests };
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];

    // Decision: Resource reallocation for at-risk initiatives
    if (analysis.initiativeAssessment.atRisk.length > 0 || analysis.initiativeAssessment.behind.length > 0) {
      const decision = await this.makeDecision(
        `Reallocate ${analysis.initiativeAssessment.atRisk.length + analysis.initiativeAssessment.behind.length} FTEs to at-risk initiatives`,
        'Strategic initiatives at risk of delay. Reallocating resources from lower-priority work to ensure delivery.',
        { revenueIncrease: 25000, costReduction: 0, customerAcquisition: 5, retentionImprovement: 0, confidence: 0.7 },
        {
          level: 'medium',
          risks: [
            { risk: 'Lower-priority work delayed', probability: 0.8, impact: 0.3, category: 'operational' },
            { risk: 'Team burnout from context switching', probability: 0.4, impact: 0.5, category: 'operational' },
          ],
          mitigationStrategies: ['Clear prioritization communication', 'Temporary contractor support', 'Scope reduction on low-priority items'],
          contingencyPlans: ['If delivery still at risk, escalate to CEO for scope/cut decisions'],
        },
        [
          { description: 'Hire contractors instead', pros: ['No context switching', 'Faster ramp'], cons: ['Higher cost', 'Less institutional knowledge'], expectedImpact: { revenueIncrease: 20000, costReduction: -5000, customerAcquisition: 4, retentionImprovement: 0, confidence: 0.6 } },
          { description: 'Cut scope on at-risk initiatives', pros: ['Faster delivery', 'Team focus'], cons: ['Reduced impact', 'Stakeholder disappointment'], expectedImpact: { revenueIncrease: 15000, costReduction: 0, customerAcquisition: 3, retentionImprovement: 0, confidence: 0.8 } },
        ]
      );
      decisions.push(decision);
    }

    // Decision: Invest in automation infrastructure
    const automationMetric = analysis.businessAssessment.keyMetrics['Automation Rate'];
    if (automationMetric && automationMetric.value < 0.8) {
      const decision = await this.makeDecision(
        'Approve $50K investment in automation platform and tooling',
        'Automation rate at ${(automationMetric.value * 100).toFixed(0)}% vs 80% target. Investment will pay back in 3 months.',
        { revenueIncrease: 0, costReduction: 15000, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
        {
          level: 'low',
          risks: [
            { risk: 'Engineering capacity constraints', probability: 0.5, impact: 0.4, category: 'operational' },
            { risk: 'Tool adoption resistance', probability: 0.3, impact: 0.3, category: 'operational' },
          ],
          mitigationStrategies: ['Phased rollout', 'Training program', 'Champion model'],
          contingencyPlans: ['If ROI not achieved in 3 months, reassess tooling choices'],
        },
        [
          { description: 'Buy vs build - purchase automation platform', pros: ['Faster deployment', 'Proven ROI'], cons: ['Ongoing cost', 'Less customization'], expectedImpact: { revenueIncrease: 0, costReduction: 10000, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.7 } },
          { description: 'Incremental automation (no big investment)', pros: ['Lower risk', 'No budget needed'], cons: ['Slower progress', 'Misses compounding benefits'], expectedImpact: { revenueIncrease: 0, costReduction: 5000, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 } },
        ]
      );
      decisions.push(decision);
    }

    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];

    // Operational efficiency insight
    const automationRate = analysis.businessAssessment.keyMetrics['Automation Rate']?.value || 0;
    if (automationRate < 0.7) {
      insights.push({
        id: `insight-coo-${Date.now()}-automation`,
        category: 'operational',
        insight: `Automation rate at ${(automationRate * 100).toFixed(0)}% - significant efficiency gains available`,
        evidence: [
          `Current cost per audit: $${analysis.businessAssessment.keyMetrics['Cost per Audit']?.value?.toFixed(2) || 'N/A'}`,
          `Target cost per audit: $0.50`,
          `Manual interventions per audit: ${analysis.businessAssessment.keyMetrics['Incident Response']?.value || 'N/A'}`,
        ],
        confidence: 0.85,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Audit all manual processes',
          'Prioritize top 5 by time savings',
          'Build automation sprint into roadmap',
          'Measure and iterate weekly',
        ],
        owner: 'coo',
      });
    }

    // System reliability insight
    const uptime = analysis.businessAssessment.keyMetrics['System Uptime']?.value || 0;
    if (uptime < 99.95) {
      insights.push({
        id: `insight-coo-${Date.now()}-reliability`,
        category: 'operational',
        insight: `System uptime at ${uptime}% - below enterprise standard of 99.95%`,
        evidence: [
          `${analysis.businessAssessment.keyMetrics['Incident Response']?.value || 0} incidents this period`,
          `Average resolution time needs measurement`,
          `Customer-facing impact unmeasured`,
        ],
        confidence: 0.9,
        impact: 'high',
        urgency: 'this_month',
        recommendedActions: [
          'Implement comprehensive monitoring',
          'Define and measure MTTR',
          'Build runbooks for top 10 failure modes',
          'Chaos engineering program',
        ],
        owner: 'coo',
      });
    }

    // Initiative execution insight
    const atRiskCount = analysis.initiativeAssessment.atRisk.length;
    const behindCount = analysis.initiativeAssessment.behind.length;
    if (atRiskCount + behindCount > 0) {
      insights.push({
        id: `insight-coo-${Date.now()}-execution`,
        category: 'operational',
        insight: `${atRiskCount + behindCount} strategic initiatives at risk or behind schedule`,
        evidence: [
          `At risk: ${atRiskCount}, Behind: ${behindCount}`,
          `Root causes: Resource constraints, unclear ownership, scope creep`,
          `Estimated revenue impact: $${(atRiskCount + behindCount) * 15000}/month delayed`,
        ],
        confidence: 0.8,
        impact: 'high',
        urgency: 'this_week',
        recommendedActions: [
          'Weekly initiative review with owners',
          'Clear escalation path for blockers',
          'Resource reallocation from low-priority work',
          'Scope negotiation with stakeholders',
        ],
        owner: 'coo',
      });
    }

    // Validated business-model opportunities (sourced by Intelligence Officer)
    for (const { opp, validation } of this.getValidatedOpportunities()) {
      insights.push({
        id: `insight-coo-${opp.id}`,
        category: 'market',
        insight: `Opportunity "${opp.title}" validation: ${validation.score}/100, ${validation.passed ? 'PASSED — ready for pilot' : 'NOT PASSED — hold'}.`,
        evidence: validation.tests.map((t) => `${t.name}: ${t.status} (${t.detail})`),
        confidence: validation.score / 100,
        impact: validation.passed ? 'medium' : 'low',
        urgency: 'this_quarter',
        recommendedActions: validation.passed
          ? [`Pilot ${opp.title}`, 'CFO to size P&L', 'Legal/compliance review']
          : ['Run deeper validation', 'Reassess in next cycle'],
        owner: 'coo',
      });
    }

    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    // Operational excellence actions
    for (const rec of analysis.recommendations) {
      actions.push({
        id: `action-coo-${Date.now()}-${rec.id}`,
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

    // Insight-driven actions
    for (const insight of analysis.strategicInsights || []) {
      if (insight.urgency === 'this_week' || insight.urgency === 'this_month') {
        actions.push({
          id: `action-coo-${Date.now()}-insight`,
          title: `Execute: ${insight.recommendedActions[0]}`,
          description: insight.recommendedActions.slice(1).join('; '),
          owner: insight.owner,
          priority: insight.urgency === 'this_week' ? 'critical' : 'high',
          dueDate: new Date(Date.now() + (insight.urgency === 'this_week' ? 7 : 30) * 24 * 3600000).toISOString().split('T')[0],
          status: 'pending',
          dependencies: [],
          estimatedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: insight.confidence },
        });
      }
    }

    // Validated, passed business-model opportunities become executable actions.
    for (const { opp, validation } of this.getValidatedOpportunities()) {
      if (!validation.passed) continue;
      actions.push({
        id: `action-coo-${opp.id}`,
        title: `Pilot: ${opp.title}`,
        description: `${opp.description} Validation passed (${validation.score}/100). Proceed to controlled pilot.`,
        owner: 'coo',
        priority: 'high',
        dueDate: new Date(Date.now() + 45 * 24 * 3600000).toISOString().split('T')[0],
        status: 'pending',
        dependencies: ['CFO P&L sign-off', 'Legal/compliance review'],
        estimatedImpact: { revenueIncrease: opp.estimatedValue / 200000, costReduction: 0.01, customerAcquisition: 0, retentionImprovement: 0.02, confidence: validation.score / 100 },
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

  // COO-specific methods
  private initializePlaybooks(): void {
    this.operationalPlaybooks.set('incident_response', {
      name: 'Incident Response',
      trigger: 'System alert or customer report',
      steps: [
        'Acknowledge within 5 min',
        'Assess severity (SEV1-4)',
        'Page on-call engineer',
        'Communicate to stakeholders',
        'Resolve or workaround',
        'Postmortem within 48h',
      ],
      owner: 'coo',
      sla: 'SEV1: 15min response, 1h resolution',
    });

    this.operationalPlaybooks.set('initiative_kickoff', {
      name: 'Initiative Kickoff',
      trigger: 'New initiative approved',
      steps: [
        'Define success criteria',
        'Assign single owner',
        'Create project plan with milestones',
        'Set up weekly check-ins',
        'Configure tracking dashboard',
        'Communicate to stakeholders',
      ],
      owner: 'coo',
      sla: 'Kickoff within 48h of approval',
    });

    this.operationalPlaybooks.set('vendor_management', {
      name: 'Vendor Management',
      trigger: 'New vendor needed or renewal',
      steps: [
        'Define requirements',
        'Evaluate 3+ vendors',
        'Negotiate terms',
        'Security review',
        'Contract execution',
        'Quarterly business review',
      ],
      owner: 'coo',
      sla: 'Decision within 2 weeks',
    });
  }

  private async generateOperationsReport(context: ExecutiveContext): Promise<OperationsReport> {
    // In production, this would query actual systems
    return {
      systemHealth: {
        uptime: 99.92,
        avgResponseTime: 245,
        errorRate: 0.001,
        throughput: 150,
        capacityUtilization: 0.65,
      },
      auditVolume: {
        totalAudits: 1247,
        completedAudits: 1198,
        failedAudits: 49,
        avgAuditTime: 28,
        auditsByType: { 'full': 800, 'quick': 398, 'api': 49 },
        revenueFromAudits: 87290,
      },
      teamPerformance: {
        agentEfficiency: { 'audit': 0.92, 'analysis': 0.88, 'reporting': 0.95 },
        taskCompletionRate: 0.94,
        avgTaskTime: 1200,
        qualityScore: 0.91,
        utilization: 0.78,
      },
      processEfficiency: {
        automationRate: 0.78,
        manualInterventions: 234,
        cycleTime: 1800,
        defectRate: 0.02,
      },
      incidents: [
        { id: 'inc-001', severity: 'medium', description: 'API rate limit exceeded', status: 'resolved', impact: '49 audits delayed', resolution: 'Implemented exponential backoff', detectedAt: '2026-07-29T10:00:00Z', resolvedAt: '2026-07-29T10:45:00Z' },
      ],
    };
  }

  private calculateOperationalHealthScore(opsReport: OperationsReport): number {
    const weights = {
      uptime: 0.3,
      automationRate: 0.25,
      taskCompletion: 0.2,
      quality: 0.15,
      incidentRate: 0.1,
    };

    const incidentRate = opsReport.incidents.length / 30; // per day
    
    return Math.round(
      opsReport.systemHealth.uptime * weights.uptime +
      opsReport.processEfficiency.automationRate * 100 * weights.automationRate +
      opsReport.teamPerformance.taskCompletionRate * 100 * weights.taskCompletion +
      opsReport.teamPerformance.qualityScore * 100 * weights.quality +
      Math.max(0, 100 - incidentRate * 20) * weights.incidentRate
    );
  }

  private identifyOperationalStrengths(opsReport: OperationsReport): string[] {
    const strengths: string[] = [];
    if (opsReport.systemHealth.uptime > 99.9) strengths.push('Excellent system uptime');
    if (opsReport.processEfficiency.automationRate > 0.75) strengths.push('High automation rate');
    if (opsReport.teamPerformance.taskCompletionRate > 0.9) strengths.push('Strong task completion');
    if (opsReport.teamPerformance.qualityScore > 0.9) strengths.push('High quality output');
    return strengths;
  }

  private identifyOperationalWeaknesses(opsReport: OperationsReport): string[] {
    const weaknesses: string[] = [];
    if (opsReport.systemHealth.uptime < 99.95) weaknesses.push('Uptime below enterprise standard');
    if (opsReport.processEfficiency.automationRate < 0.8) weaknesses.push('Automation rate below target');
    if (opsReport.processEfficiency.manualInterventions > 100) weaknesses.push('High manual intervention count');
    if (opsReport.incidents.length > 0) weaknesses.push(`${opsReport.incidents.length} incidents this period`);
    return weaknesses;
  }

  private identifyOperationalOpportunities(context: ExecutiveContext): string[] {
    const opportunities: string[] = [];
    if (context.resourceAllocation.technology.infrastructure.cloudSpend > 10000) {
      opportunities.push('Optimize cloud infrastructure costs');
    }
    if (context.activeInitiatives.some(i => i.status === 'planning')) {
      opportunities.push('Accelerate initiative planning-to-execution');
    }
    opportunities.push('Implement predictive scaling');
    opportunities.push('Build self-service customer onboarding');
    return opportunities;
  }

  private identifyOperationalThreats(opsReport: OperationsReport): string[] {
    const threats: string[] = [];
    if (opsReport.systemHealth.capacityUtilization > 0.8) threats.push('Approaching capacity limits');
    if (opsReport.processEfficiency.defectRate > 0.05) threats.push('Quality degradation risk');
    if (opsReport.teamPerformance.utilization > 0.9) threats.push('Team burnout risk');
    return threats;
  }

  getOperationalPlaybooks(): Map<string, OperationalPlaybook> {
    return new Map(this.operationalPlaybooks);
  }

  async executePlaybook(playbookName: string, params: Record<string, unknown>): Promise<PlaybookExecution> {
    const playbook = this.operationalPlaybooks.get(playbookName);
    if (!playbook) throw new Error(`Playbook ${playbookName} not found`);

    return {
      playbook: playbookName,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      currentStep: 0,
      params,
      steps: playbook.steps,
    };
  }
}

export interface OperationalPlaybook {
  name: string;
  trigger: string;
  steps: string[];
  owner: string;
  sla: string;
}

export interface ProcessMetrics {
  auditCycleTime: number;
  automationRate: number;
  defectRate: number;
  customerOnboardingTime: number;
  incidentMTTR: number;
  deploymentFrequency: number;
}

export interface PlaybookExecution {
  playbook: string;
  startedAt: string;
  status: 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  params: Record<string, unknown>;
  steps: string[];
}