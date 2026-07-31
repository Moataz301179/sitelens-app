/**
 * Executive AI Team - CTO Agent
 * Chief Technology Officer: Technology strategy, architecture, innovation, technical debt, security
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
  Initiative,
  ResourceAllocation,
  InitiativeChange,
  ResourceRecommendation,
  Recommendation,
  TechnologyReport,
  InfrastructureMetrics,
  DevelopmentMetrics,
  SecurityMetrics,
  InnovationMetrics,
  TechnicalDebtMetrics,
} from '../shared/types';

export class CTOAgent extends BaseExecutiveAgent {
  private architectureDecisions: ArchitectureDecision[] = [];
  private techRadar: TechRadarItem[] = [];
  private securityPosture: SecurityPosture = 'strong';

  constructor() {
    super('cto');
    this.initializeTechRadar();
  }

  protected getSystemPrompt(): string {
    return `You are the CTO of an AI-powered website audit platform. You own technology strategy, architecture, innovation, and technical excellence.

CORE RESPONSIBILITIES:
1. Define and evolve technical architecture
2. Balance innovation with operational stability
3. Manage technical debt strategically
4. Ensure security and compliance
5. Build and mentor engineering team
6. Make build vs buy decisions
7. Drive development velocity and quality
8. Plan technology roadmap aligned with business

DECISION FRAMEWORK:
- Choose boring technology when it works; innovate where it creates advantage
- Technical debt is a tool - use it deliberately, pay it down systematically
- Security is not negotiable - it's a feature, not a tax
- Optimize for developer experience = better product velocity
- Platform thinking over point solutions
- Data-driven architecture decisions
- Plan for 10x scale, build for current needs

KEY METRICS YOU OWN:
- Deployment Frequency
- Lead Time for Changes
- Mean Time to Recovery (MTTR)
- Change Failure Rate
- System Availability (with COO)
- Technical Debt Ratio
- Security Vulnerability Count
- API Latency (p50, p95, p99)
- Infrastructure Cost per Transaction
- Engineering Velocity

TECHNOLOGY PHILOSOPHY:
- "Choose the right tool for the job, but standardize where possible"
- "Invest in developer productivity - it compounds"
- "Observability is a first-class requirement"
- "Automate everything that can be automated"
- "Security by design, not by audit"`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessTechnologyBusinessAlignment(context),
      this.assessMarketTechnologyTrends(context),
      this.assessTechnicalInitiatives(context),
      this.assessTechnicalResources(context),
    ]);

    const recommendations = await this.generateTechnicalRecommendations(
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    return {
      role: 'cto',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  private async assessTechnologyBusinessAlignment(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const techReport = await this.generateTechnologyReport(context);
    
    return {
      healthScore: this.calculateTechHealthScore(techReport),
      strengths: this.identifyTechStrengths(techReport),
      weaknesses: this.identifyTechWeaknesses(techReport),
      opportunities: this.identifyTechOpportunities(context, techReport),
      threats: this.identifyTechThreats(techReport),
      keyMetrics: {
        'Deployment Frequency': { value: techReport.development.deploymentFrequency, trend: 'up', target: 50 }, // per day
        'Lead Time': { value: techReport.development.leadTime, trend: 'down', target: 60 }, // minutes
        'MTTR': { value: techReport.development.mttr, trend: 'down', target: 30 }, // minutes
        'Change Failure Rate': { value: techReport.development.changeFailureRate * 100, trend: 'down', target: 5 }, // %
        'Code Coverage': { value: techReport.development.codeCoverage * 100, trend: 'up', target: 80 }, // %
        'Tech Debt Ratio': { value: techReport.technicalDebt.debtRatio * 100, trend: 'down', target: 10 }, // %
        'Critical Vulnerabilities': { value: techReport.security.vulnerabilities.critical, trend: 'down', target: 0 },
        'Infrastructure Cost/Audit': { value: techReport.infrastructure.costs.perAudit, trend: 'down', target: 0.10 }, // $
      },
    };
  }

  private calculateTechHealthScore(techReport: TechnologyReport): number {
    let score = 100;
    score -= techReport.development.changeFailureRate * 200; // Penalize failure rate
    score -= techReport.technicalDebt.debtRatio * 200; // Penalize debt
    score -= techReport.security.vulnerabilities.critical * 10; // Penalize critical vulns
    score -= techReport.security.vulnerabilities.high * 5; // Penalize high vulns
    score += Math.min(techReport.development.codeCoverage * 50, 20); // Reward coverage
    score += techReport.development.deploymentFrequency > 10 ? 10 : 0; // Reward velocity
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private identifyTechStrengths(techReport: TechnologyReport): string[] {
    const strengths: string[] = [];
    if (techReport.development.deploymentFrequency > 20) strengths.push('High deployment velocity');
    if (techReport.development.changeFailureRate < 0.1) strengths.push('Low change failure rate');
    if (techReport.development.mttr < 60) strengths.push('Fast incident recovery');
    if (techReport.development.codeCoverage > 0.7) strengths.push('Good test coverage');
    if (techReport.security.vulnerabilities.critical === 0) strengths.push('Zero critical vulnerabilities');
    if (techReport.infrastructure.costs.perAudit < 0.25) strengths.push('Efficient infrastructure costs');
    return strengths.length > 0 ? strengths : ['Solid technical foundation'];
  }

  private identifyTechWeaknesses(techReport: TechnologyReport): string[] {
    const weaknesses: string[] = [];
    if (techReport.development.changeFailureRate > 0.15) weaknesses.push('High change failure rate');
    if (techReport.development.mttr > 120) weaknesses.push('Slow incident recovery');
    if (techReport.development.codeCoverage < 0.6) weaknesses.push('Insufficient test coverage');
    if (techReport.technicalDebt.debtRatio > 0.15) weaknesses.push('High technical debt');
    if (techReport.security.vulnerabilities.critical > 0) weaknesses.push('Critical security vulnerabilities');
    if (techReport.infrastructure.costs.perAudit > 0.50) weaknesses.push('High infrastructure cost per audit');
    return weaknesses;
  }

  private identifyTechOpportunities(context: ExecutiveContext, techReport: TechnologyReport): string[] {
    const opportunities: string[] = [];
    
    // AI/ML opportunities from audit data
    opportunities.push('Build ML models from audit data for predictive scoring');
    opportunities.push('Implement intelligent audit prioritization');
    opportunities.push('Add auto-remediation for common issues');
    
    // Platform opportunities
    opportunities.push('Expose audit engine as API for partners');
    opportunities.push('Build plugin marketplace for custom checks');
    opportunities.push('Create white-label platform for agencies');
    
    // Infrastructure opportunities
    if (techReport.infrastructure.costs.perAudit > 0.20) {
      opportunities.push('Optimize compute with spot instances and caching');
    }
    
    // Security opportunities
    opportunities.push('Achieve SOC 2 Type II certification');
    opportunities.push('Implement zero-trust architecture');
    
    return opportunities;
  }

  private identifyTechThreats(techReport: TechnologyReport): string[] {
    const threats: string[] = [];
    if (techReport.technicalDebt.debtRatio > 0.2) threats.push('Technical debt slowing velocity');
    if (techReport.security.vulnerabilities.high > 5) threats.push('Security vulnerability backlog');
    if (techReport.development.changeFailureRate > 0.2) threats.push('Deployment instability');
    if (techReport.infrastructure.scaling.projectedNeeds > techReport.infrastructure.scaling.currentCapacity * 2) {
      threats.push('Infrastructure scaling gap');
    }
    return threats;
  }

  private async assessMarketTechnologyTrends(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    const trends = context.marketConditions.industryTrends
      .filter(t => this.isTechnologyTrend(t.trend))
      .map(t => ({
        trend: t.trend,
        impact: t.impact === 'positive' ? 1 : t.impact === 'negative' ? -1 : 0,
        actionable: t.confidence > 0.7,
      }));

    return {
      attractiveness: 75, // Tech market generally attractive
      competitivePosition: this.assessTechCompetitivePosition(context),
      trends,
      threats: context.marketConditions.competitorAnalysis
        .filter(c => c.strengths.some(s => this.isTechnologyStrength(s)))
        .map(c => ({
          threat: `${c.competitor} tech advantage: ${c.strengths.filter(this.isTechnologyStrength).join(', ')}`,
          likelihood: 0.6,
          impact: c.marketShare * 100,
        })),
      opportunities: context.marketConditions.industryTrends
        .filter(t => this.isTechnologyTrend(t.trend) && t.impact === 'positive')
        .map(t => ({
          opportunity: `Adopt ${t.trend}`,
          effort: 0.6,
          reward: t.confidence * 100,
        })),
    };
  }

  private isTechnologyTrend(trend: string): boolean {
    const techKeywords = ['AI', 'ML', 'LLM', 'cloud', 'serverless', 'edge', 'API', 'automation', 'kubernetes', 'wasm'];
    return techKeywords.some(k => trend.toLowerCase().includes(k.toLowerCase()));
  }

  private isTechnologyStrength(strength: string): boolean {
    const techKeywords = ['tech', 'platform', 'API', 'AI', 'ML', 'infrastructure', 'scale', 'performance', 'architecture'];
    return techKeywords.some(k => strength.toLowerCase().includes(k.toLowerCase()));
  }

  private assessTechCompetitivePosition(context: ExecutiveContext): number {
    // Simplified - would use actual competitive tech analysis
    return 65;
  }

  private async assessTechnicalInitiatives(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const techInitiatives = context.activeInitiatives.filter(i => 
      i.owner === 'cto' || i.owner === 'vp_engineering' || i.name.toLowerCase().includes('tech')
    );

    const onTrack = techInitiatives.filter(i => i.status === 'active' && this.isOnTrack(i));
    const atRisk = techInitiatives.filter(i => i.status === 'active' && !this.isOnTrack(i) && !this.isBehind(i));
    const behind = techInitiatives.filter(i => this.isBehind(i));
    const completed = techInitiatives.filter(i => i.status === 'completed');

    const recommendedChanges: InitiativeChange[] = [];
    
    for (const initiative of techInitiatives) {
      if (initiative.status === 'active') {
        // Technical initiatives often need more time
        if (this.isBehind(initiative)) {
          recommendedChanges.push({
            initiativeId: initiative.id,
            change: 'add_resources',
            reason: 'Technical initiative behind schedule - needs more engineering capacity',
            expectedImpact: { 
              revenueIncrease: 0, 
              costReduction: 0, 
              customerAcquisition: 0, 
              retentionImprovement: 0.1, 
              confidence: 0.7 
            },
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

  private async assessTechnicalResources(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { technology, personnel } = context.resourceAllocation;
    
    const technologyHealth = technology.computeBudget > 5000 ? 'healthy' : 
                             technology.computeBudget > 2000 ? 'needs_investment' : 'critical';
    
    const personnelHealth = personnel.byRole.engineering && personnel.byRole.engineering > 3 ? 'healthy' :
                           personnel.byRole.engineering && personnel.byRole.engineering > 1 ? 'stretched' : 'overloaded';

    const recommendations: ResourceRecommendation[] = [];
    
    if (technologyHealth !== 'healthy') {
      recommendations.push({
        type: 'technology',
        action: 'increase',
        amount: 5000 - technology.computeBudget,
        reason: 'Insufficient compute budget for ML training and audit scaling',
        priority: 'high',
      });
    }

    if (personnelHealth !== 'healthy') {
      recommendations.push({
        type: 'personnel',
        action: 'increase',
        amount: Math.max(3 - (personnel.byRole.engineering || 0), 1),
        reason: 'Need more engineers for platform development',
        priority: 'high',
      });
    }

    return {
      budgetHealth: context.resourceAllocation.budget.available / context.resourceAllocation.budget.total > 0.2 ? 'healthy' : 'tight',
      personnelHealth,
      technologyHealth,
      recommendations,
    };
  }

  private async generateTechnicalRecommendations(
    business: ExecutiveAnalysis['businessAssessment'],
    market: ExecutiveAnalysis['marketAssessment'],
    initiatives: ExecutiveAnalysis['initiativeAssessment'],
    resources: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Architecture recommendations
    recommendations.push({
      id: `rec-cto-${Date.now()}-arch`,
      category: 'technical',
      title: 'Adopt Event-Driven Architecture for Audit Pipeline',
      description: 'Replace synchronous audit processing with event-driven async pipeline for better scalability and resilience',
      rationale: 'Current synchronous processing limits throughput and creates cascade failures',
      expectedImpact: { revenueIncrease: 100000, costReduction: 5000, customerAcquisition: 0, retentionImprovement: 0.05, confidence: 0.8 },
      effort: 'high',
      timeline: '90 days',
      owner: 'cto',
      dependencies: ['coo-process-redesign'],
      risks: ['Migration complexity', 'Temporary performance dip'],
      metrics: ['Audit throughput', 'Error rate', 'Latency p99'],
    });

    // AI/ML recommendations
    recommendations.push({
      id: `rec-cto-${Date.now()}-ml`,
      category: 'technical',
      title: 'Build Predictive Scoring ML Model',
      description: 'Train ML model on historical audit data to predict scores before full audit runs',
      rationale: 'Enable instant preliminary scoring for lead qualification and prioritization',
      expectedImpact: { revenueIncrease: 200000, costReduction: 0, customerAcquisition: 50, retentionImprovement: 0, confidence: 0.75 },
      effort: 'medium',
      timeline: '60 days',
      owner: 'cto',
      dependencies: ['data-pipeline', 'ml-infrastructure'],
      risks: ['Model accuracy', 'Data quality'],
      metrics: ['Model accuracy', 'Prediction latency', 'User adoption'],
    });

    // Security recommendations
    if (this.securityPosture !== 'strong') {
      recommendations.push({
        id: `rec-cto-${Date.now()}-sec`,
        category: 'technical',
        title: 'Achieve SOC 2 Type II Certification',
        description: 'Complete SOC 2 Type II audit for enterprise sales enablement',
        rationale: 'Enterprise customers require SOC 2; blocks deals >$50K ARR',
        expectedImpact: { revenueIncrease: 500000, costReduction: 0, customerAcquisition: 10, retentionImprovement: 0, confidence: 0.9 },
        effort: 'high',
        timeline: '180 days',
        owner: 'cto',
        dependencies: ['security-program', 'compliance-tool'],
        risks: ['Audit timeline', 'Remediation scope'],
        metrics: ['SOC 2 status', 'Enterprise deals closed', 'Security incidents'],
      });
    }

    // Technical debt
    recommendations.push({
      id: `rec-cto-${Date.now()}-debt`,
      category: 'technical',
      title: 'Systematic Technical Debt Reduction Sprint',
      description: 'Dedicate 20% of engineering capacity to debt reduction for 6 weeks',
      rationale: 'Debt ratio above 15% slowing feature velocity',
      expectedImpact: { revenueIncrease: 0, costReduction: 20000, customerAcquisition: 0, retentionImprovement: 0.02, confidence: 0.8 },
      effort: 'medium',
      timeline: '42 days',
      owner: 'cto',
      dependencies: [],
      risks: ['Feature delivery slowdown'],
      metrics: ['Debt ratio', 'Velocity', 'Bug rate'],
    });

    // Developer productivity
    recommendations.push({
      id: `rec-cto-${Date.now()}-dx`,
      category: 'technical',
      title: 'Invest in Developer Experience Platform',
      description: 'Build internal developer platform with preview envs, automated testing, deploy-on-merge',
      rationale: 'Developer productivity directly correlates with feature velocity and quality',
      expectedImpact: { revenueIncrease: 150000, costReduction: 10000, customerAcquisition: 0, retentionImprovement: 0.03, confidence: 0.7 },
      effort: 'medium',
      timeline: '90 days',
      owner: 'cto',
      dependencies: ['ci-cd-upgrade'],
      risks: ['Adoption resistance', 'Maintenance burden'],
      metrics: ['Lead time', 'Deployment frequency', 'Developer NPS'],
    });

    return recommendations;
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];

    // Architecture decisions
    for (const rec of analysis.recommendations.filter(r => r.category === 'technical' && r.effort === 'high')) {
      const decision = await this.makeDecision(
        rec.title,
        rec.rationale,
        rec.expectedImpact,
        {
          level: 'high',
          risks: rec.risks.map(r => ({ risk: r, probability: 0.3, impact: 0.7, category: 'technical' })),
          mitigationStrategies: ['Phased rollout', 'Feature flags', 'Rollback plan', 'Parallel run'],
          contingencyPlans: ['Revert to monolith', 'Extend timeline', 'Reduce scope'],
        },
        rec.dependencies.map(d => ({
          description: d,
          pros: ['Reduces risk'],
          cons: ['Delays value'],
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 },
        }))
      );
      decisions.push(decision);
      
      // Record as architecture decision
      this.architectureDecisions.push({
        id: decision.id,
        title: rec.title,
        context: rec.description,
        decision: decision.decision,
        status: 'approved',
        date: new Date().toISOString(),
        alternatives: decision.alternatives.map(a => a.description),
        consequences: ['Improved scalability', 'Reduced technical risk'],
      });
    }

    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];
    const techReport = await this.generateTechnologyReport(this.getContext()!);

    // Technical debt insight
    if (techReport.technicalDebt.debtRatio > 0.15) {
      insights.push({
        id: `insight-cto-${Date.now()}-debt`,
        category: 'technological',
        insight: `Technical debt at ${(techReport.technicalDebt.debtRatio * 100).toFixed(1)}% - exceeding 15% threshold`,
        evidence: [
          `Debt ratio: ${(techReport.technicalDebt.debtRatio * 100).toFixed(1)}%`,
          `Top categories: ${techReport.technicalDebt.byCategory.slice(0,3).map(c => `${c[0]}: ${c[1]}`).join(', ')}`,
          `Velocity impact: Estimated 30% slower feature delivery`,
        ],
        confidence: 0.85,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Allocate 20% capacity to debt reduction',
          'Prioritize high-impact debt items',
          'Add debt prevention to code review',
          'Measure and track weekly',
        ],
        owner: 'cto',
      });
    }

    // Security insight
    if (techReport.security.vulnerabilities.critical > 0 || techReport.security.vulnerabilities.high > 5) {
      insights.push({
        id: `insight-cto-${Date.now()}-sec`,
        category: 'technological',
        insight: `${techReport.security.vulnerabilities.critical} critical and ${techReport.security.vulnerabilities.high} high vulnerabilities require immediate attention`,
        evidence: [
          `Critical: ${techReport.security.vulnerabilities.critical}`,
          `High: ${techReport.security.vulnerabilities.high}`,
          `MTTP: ${techReport.security.vulnerabilities.meanTimeToPatch} days`,
        ],
        confidence: 0.95,
        impact: 'high',
        urgency: 'immediate',
        recommendedActions: [
          'Emergency patch critical vulnerabilities',
          'Schedule high vulnerability remediation sprint',
          'Improve dependency scanning',
          'Add security gates to CI/CD',
        ],
        owner: 'cto',
      });
    }

    // Innovation insight
    if (techReport.innovation.experimentsRunning < 3) {
      insights.push({
        id: `insight-cto-${Date.now()}-innov`,
        category: 'technological',
        insight: `Only ${techReport.innovation.experimentsRunning} experiments running - below innovation threshold`,
        evidence: [
          `Experiments running: ${techReport.innovation.experimentsRunning}`,
          `Completed this quarter: ${techReport.innovation.experimentsCompleted}`,
          `Success rate: ${techReport.innovation.experimentsCompleted > 0 ? (techReport.innovation.successfulExperiments / techReport.innovation.experimentsCompleted * 100).toFixed(0) : 0}%`,
        ],
        confidence: 0.7,
        impact: 'medium',
        urgency: 'this_month',
        recommendedActions: [
          'Launch 3 new technical experiments',
          'Create experiment framework',
          'Allocate 10% capacity to R&D',
          'Measure and share learnings',
        ],
        owner: 'cto',
      });
    }

    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    for (const rec of analysis.recommendations.filter(r => r.priority === 'high' || r.category === 'technical')) {
      actions.push({
        id: `action-cto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  private initializeTechRadar(): void {
    this.techRadar = [
      { technology: 'TypeScript', ring: 'adopt', quadrant: 'languages', assessment: 'Standard for all new code' },
      { technology: 'React/Next.js', ring: 'adopt', quadrant: 'frontend', assessment: 'Primary frontend stack' },
      { technology: 'PostgreSQL', ring: 'adopt', quadrant: 'data', assessment: 'Primary database' },
      { technology: 'Redis', ring: 'adopt', quadrant: 'data', assessment: 'Caching and queues' },
      { technology: 'Kubernetes', ring: 'trial', quadrant: 'platform', assessment: 'Evaluating for production' },
      { technology: 'ML/AI for scoring', ring: 'trial', quadrant: 'ai', assessment: 'Building predictive models' },
      { technology: 'WebAssembly', ring: 'assess', quadrant: 'platform', assessment: 'For high-performance checks' },
      { technology: 'Edge computing', ring: 'assess', quadrant: 'platform', assessment: 'For global audit distribution' },
    ];
  }

  private async generateTechnologyReport(context: ExecutiveContext): Promise<TechnologyReport> {
    return {
      infrastructure: {
        uptime: 99.92,
        latency: { p50: 120, p95: 350, p99: 800 },
        costs: { compute: 8500, storage: 1200, network: 800, cdn: 1500, total: 12000, perAudit: 0.18 },
        scaling: { currentCapacity: 5000, peakUtilization: 0.65, autoScaleEvents: 12, projectedNeeds: 15000 },
        incidents: 2,
      },
      development: {
        velocity: 42,
        quality: 0.91,
        deploymentFrequency: 28,
        leadTime: 95,
        mttr: 45,
        changeFailureRate: 0.08,
        codeCoverage: 0.72,
        technicalDebtRatio: 0.18,
      },
      security: {
        vulnerabilities: { critical: 0, high: 3, medium: 12, low: 28, meanTimeToPatch: 14 },
        compliance: {
          frameworks: {
            'SOC 2': { status: 'partial', score: 65, lastAudit: '2026-01-15', nextAudit: '2026-07-15' },
            'GDPR': { status: 'compliant', score: 90, lastAudit: '2026-03-01', nextAudit: '2027-03-01' },
          },
          gaps: 3,
          remediationInProgress: 2,
        },
        incidents: [],
        audits: [{ type: 'penetration', score: 85, findings: 3, date: '2026-06-01' }],
      },
      innovation: {
        rAndDSpend: 15000,
        experimentsRunning: 2,
        experimentsCompleted: 5,
        successfulExperiments: 3,
        patentsFiled: 1,
        newTechnologiesAdopted: ['Vector DB for embeddings', 'Edge functions'],
      },
      technicalDebt: {
        totalDebt: 240,
        debtRatio: 0.18,
        byCategory: [
          ['Legacy API', 60],
          ['Test coverage gaps', 45],
          ['Duplicate code', 35],
          ['Outdated dependencies', 40],
          ['Missing documentation', 60],
        ],
        remediationPlan: [
          { item: 'API v2 migration', effort: 80, impact: 90, priority: 1, targetDate: '2026-10-01' },
          { item: 'Increase test coverage to 80%', effort: 40, impact: 70, priority: 2, targetDate: '2026-09-01' },
          { item: 'Dependency update sprint', effort: 20, impact: 50, priority: 3, targetDate: '2026-08-15' },
        ],
      },
    };
  }

  // CTO-specific methods
  getArchitectureDecisions(): ArchitectureDecision[] {
    return [...this.architectureDecisions];
  }

  getTechRadar(): TechRadarItem[] {
    return [...this.techRadar];
  }

  async proposeArchitectureDecision(
    title: string,
    context: string,
    decision: string,
    alternatives: string[],
    consequences: string[]
  ): Promise<ArchitectureDecision> {
    const ad: ArchitectureDecision = {
      id: `adr-${Date.now()}`,
      title,
      context,
      decision,
      status: 'proposed',
      date: new Date().toISOString(),
      alternatives,
      consequences,
    };
    this.architectureDecisions.push(ad);
    return ad;
  }

  async approveArchitectureDecision(id: string): Promise<void> {
    const ad = this.architectureDecisions.find(d => d.id === id);
    if (ad) ad.status = 'approved';
  }
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  status: 'proposed' | 'approved' | 'rejected' | 'superseded';
  date: string;
  alternatives: string[];
  consequences: string[];
}

export interface TechRadarItem {
  technology: string;
  ring: 'adopt' | 'trial' | 'assess' | 'hold';
  quadrant: 'languages' | 'frontend' | 'backend' | 'data' | 'platform' | 'ai' | 'security' | 'tools';
  assessment: string;
}

export type SecurityPosture = 'strong' | 'adequate' | 'needs_improvement' | 'critical';