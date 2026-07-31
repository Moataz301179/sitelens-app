/**
 * Executive AI Team - CMO Agent
 * Chief Marketing Officer: Brand, demand generation, content, social media automation, growth
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
  MarketingReport,
  CampaignMetrics,
  ContentMetrics,
  SocialMetrics,
  SEOMetrics,
  BrandMetrics,
  MarketingROI,
  AuditSummary,
  IssueSummary,
  ScoresSummary,
} from '../shared/types';
import { MetaAdsClient, MetaOptimizationResult } from '../social/meta-ads-client';

export class CMOAgent extends BaseExecutiveAgent {
  private contentEngine: ContentEngine;
  private socialAutomation: SocialMediaAutomation;
  private brandGuidelines: BrandGuidelines;
  private competitorContent: Map<string, CompetitorContent> = new Map();

  constructor() {
    super('cmo');
    this.contentEngine = new ContentEngine();
    this.socialAutomation = new SocialMediaAutomation();
    this.brandGuidelines = this.loadBrandGuidelines();
  }

  protected getSystemPrompt(): string {
    return `You are the CMO of an AI-powered website audit platform. You own brand, demand generation, content, social media, and growth marketing.

CORE RESPONSIBILITIES:
1. Brand strategy and positioning
2. Demand generation across channels
3. Content strategy and creation
4. Social media presence and automation
5. SEO and organic growth
6. Product marketing and launches
7. Marketing analytics and attribution
8. Marketing team leadership

DECISION FRAMEWORK:
- Brand consistency across all touchpoints
- Data-driven channel allocation
- Content that educates and converts
- Automate distribution, humanize creation
- Build community, not just audience
- Measure full-funnel impact
- Test, learn, scale what works

KEY METRICS YOU OWN:
- Pipeline Generated ($)
- CAC by Channel
- Marketing Qualified Leads (MQLs)
- Content Engagement Rate
- Social Follower Growth
- Brand Awareness / Share of Voice
- Marketing ROI (ROAS)
- Attribution-Modeled Revenue
- Email/Newsletter Metrics
- SEO Rankings & Organic Traffic

MARKETING PHILOSOPHY:
- "Attract, don't interrupt"
- "Content is the currency of trust"
- "Brand is what people say when you're not in the room"
- "Distribution is as important as creation"
- "Every touchpoint is a chance to delight"`;
  }

  async analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis> {
    this.setContext(context);

    const [businessAssessment, marketAssessment, initiativeAssessment, resourceAssessment] = await Promise.all([
      this.assessMarketingPerformance(context),
      this.assessMarketOpportunity(context),
      this.assessMarketingInitiatives(context),
      this.assessMarketingResources(context),
    ]);

    const recommendations = await this.generateMarketingRecommendations(
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment
    );

    // Ensure Meta Ads attribution is honest: disable view-through, misplacements
    // and Advantage+ enhancements (all on by default). Dry-run unless creds set.
    const meta = await this.optimizeMetaCampaigns();
    recommendations.push({
      id: `rec-cmo-meta-${Date.now()}`,
      category: 'marketing',
      title: 'Harden Meta Ads attribution settings',
      description: meta.summary,
      rationale: 'Meta defaults inflate reported conversions and waste spend. These three settings must be off by default.',
      expectedImpact: { revenueIncrease: 0, costReduction: meta.dryRun ? 0 : 5000, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.8 },
      effort: 'low',
      timeline: '1 week',
      owner: 'cmo',
      dependencies: meta.dryRun ? ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID'] : [],
      risks: ['Requires ad-account access'],
      metrics: ['view_through_disabled', 'misplacements_excluded', 'enhancements_off'],
      priority: 'high',
    });

    return {
      role: 'cmo',
      timestamp: new Date().toISOString(),
      businessAssessment,
      marketAssessment,
      initiativeAssessment,
      resourceAssessment,
      recommendations,
      confidence: this.calculateConfidence(businessAssessment, marketAssessment),
    };
  }

  /**
   * Disable Meta's default-on attribution distortions. Returns a dry-run plan
   * unless META_ACCESS_TOKEN + META_AD_ACCOUNT_ID are configured.
   */
  async optimizeMetaCampaigns(): Promise<MetaOptimizationResult> {
    const client = new MetaAdsClient();
    return client.optimizeAccount();
  }

  private async assessMarketingPerformance(context: ExecutiveContext): Promise<ExecutiveAnalysis['businessAssessment']> {
    const marketingReport = await this.generateMarketingReport(context);
    
    return {
      healthScore: this.calculateMarketingHealthScore(marketingReport),
      strengths: this.identifyMarketingStrengths(marketingReport),
      weaknesses: this.identifyMarketingWeaknesses(marketingReport),
      opportunities: this.identifyMarketingOpportunities(context, marketingReport),
      threats: this.identifyMarketingThreats(context, marketingReport),
      keyMetrics: {
        'Marketing ROI': { value: marketingReport.roi.totalSpend > 0 ? (marketingReport.roi.attributedRevenue / marketingReport.roi.totalSpend) : 0, trend: 'up', target: 5 },
        'CAC': { value: marketingReport.roi.cac, trend: marketingReport.roi.cac > 150 ? 'up' : 'down', target: 100 },
        'LTV:CAC': { value: marketingReport.roi.ltvToCac, trend: marketingReport.roi.ltvToCac > 3 ? 'up' : 'stable', target: 5 },
        'Social Growth': { value: this.avgSocialGrowth(marketingReport.social.followerGrowth), trend: 'up', target: 0.1 },
        'Engagement Rate': { value: marketingReport.content.avgEngagementRate, trend: 'stable', target: 0.05 },
        'Organic Traffic': { value: marketingReport.seo.organicTraffic, trend: 'up', target: 50000 },
        'MQLs': { value: this.estimateMQLs(marketingReport), trend: 'up', target: 500 },
        'Brand Awareness': { value: marketingReport.brand.brandAwareness, trend: 'up', target: 60 },
      },
    };
  }

  private calculateMarketingHealthScore(report: MarketingReport): number {
    let score = 0;
    score += Math.min(report.roi.ltvToCac * 15, 30);
    score += Math.min((report.roi.attributedRevenue / Math.max(1, report.roi.totalSpend)) * 8, 20);
    score += Math.min(report.content.avgEngagementRate * 1000, 15);
    score += Math.min(this.avgSocialGrowth(report.social.followerGrowth) * 200, 15);
    score += Math.min(report.seo.domainAuthority, 20);
    return Math.round(Math.min(100, score));
  }

  private identifyMarketingStrengths(report: MarketingReport): string[] {
    const strengths: string[] = [];
    if (report.roi.ltvToCac > 4) strengths.push('Excellent marketing efficiency');
    if (report.content.avgEngagementRate > 0.04) strengths.push('High content engagement');
    if (this.avgSocialGrowth(report.social.followerGrowth) > 0.05) strengths.push('Strong social growth');
    if (report.seo.domainAuthority > 50) strengths.push('Strong domain authority');
    if (report.brand.nps > 50) strengths.push('Strong brand NPS');
    return strengths.length > 0 ? strengths : ['Building marketing foundation'];
  }

  private identifyMarketingWeaknesses(report: MarketingReport): string[] {
    const weaknesses: string[] = [];
    if (report.roi.cac > 200) weaknesses.push('High CAC');
    if (report.content.avgEngagementRate < 0.02) weaknesses.push('Low content engagement');
    if (this.avgSocialGrowth(report.social.followerGrowth) < 0.02) weaknesses.push('Slow social growth');
    if (report.seo.organicTraffic < 10000) weaknesses.push('Low organic traffic');
    if (report.roi.ltvToCac < 3) weaknesses.push('Weak unit economics on marketing');
    return weaknesses;
  }

  private identifyMarketingOpportunities(context: ExecutiveContext, report: MarketingReport): string[] {
    const opportunities: string[] = [];
    
    // Social media automation opportunities
    opportunities.push('Automate LinkedIn content via Agent-Reach integration');
    opportunities.push('Deploy Twitter/X bot for real-time audit insights');
    opportunities.push('Create video content from audit reports');
    
    // SEO opportunities
    if (report.seo.contentGaps.length > 0) {
      opportunities.push(`Create content for ${report.seo.contentGaps.length} identified SEO gaps`);
    }
    
    // Channel opportunities
    const channelROIs = Object.entries(report.roi.byChannel);
    const bestChannel = channelROIs.sort((a, b) => b[1].roas - a[1].roas)[0];
    if (bestChannel) {
      opportunities.push(`Scale ${bestChannel[0]} - highest ROAS (${bestChannel[1].roas.toFixed(1)}x)`);
    }
    
    // Competitive gaps
    context.marketConditions.competitorAnalysis.forEach(c => {
      if (c.weaknesses.some(w => w.toLowerCase().includes('brand') || w.toLowerCase().includes('content'))) {
        opportunities.push(`Exploit ${c.competitor} content/brand weakness`);
      }
    });
    
    return opportunities;
  }

  private identifyMarketingThreats(context: ExecutiveContext, report: MarketingReport): string[] {
    const threats: string[] = [];
    if (report.social.sentiment.score < 0) threats.push('Negative social sentiment');
    if (this.avgSocialGrowth(report.social.followerGrowth) < 0) threats.push('Declining social following');
    if (report.roi.cac > context.businessState.costs.ltv * 0.4) threats.push('CAC unsustainably high');
    context.marketConditions.competitorAnalysis
      .filter(c => c.threatLevel === 'high')
      .forEach(c => threats.push(`${c.competitor} outspending on marketing`));
    return threats;
  }

  private avgSocialGrowth(growth: Record<string, number>): number {
    const values = Object.values(growth);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private estimateMQLs(report: MarketingReport): number {
    // Simplified estimate
    return Math.round(report.seo.organicTraffic * 0.01 + report.social.mentions * 0.5 + report.content.totalViews * 0.002);
  }

  private async assessMarketOpportunity(context: ExecutiveContext): Promise<ExecutiveAnalysis['marketAssessment']> {
    const demandSignals = context.marketConditions.demandSignals.filter(s => s.actionable);
    
    return {
      attractiveness: Math.min(95, 70 + demandSignals.length * 3),
      competitivePosition: this.assessBrandCompetitivePosition(context),
      trends: context.marketConditions.industryTrends
        .filter(t => this.isMarketingTrend(t.trend))
        .map(t => ({ trend: t.trend, impact: t.impact === 'positive' ? 0.7 : -0.5, actionable: true })),
      threats: context.marketConditions.competitorAnalysis
        .filter(c => c.threatLevel === 'high')
        .map(c => ({ threat: `${c.competitor} brand strength`, likelihood: 0.6, impact: c.marketShare * 50 })),
      opportunities: demandSignals.map(s => ({ opportunity: s.signal, effort: 1 - s.strength, reward: s.strength * 100 })),
    };
  }

  private isMarketingTrend(trend: string): boolean {
    const mk = ['content', 'social', 'brand', 'seo', 'influencer', 'video', 'community', 'organic'];
    return mk.some(k => trend.toLowerCase().includes(k));
  }

  private assessBrandCompetitivePosition(context: ExecutiveContext): number {
    const ourShare = context.businessState.customerMetrics.totalCustomers;
    const leaderCustomers = Math.max(...context.marketConditions.competitorAnalysis.map(c => c.marketShare * 10000), 1);
    return Math.min(100, (ourShare / leaderCustomers) * 100);
  }

  private async assessMarketingInitiatives(context: ExecutiveContext): Promise<ExecutiveAnalysis['initiativeAssessment']> {
    const marketingInitiatives = context.activeInitiatives.filter(i => 
      i.owner === 'cmo' || i.owner === 'vp_marketing' || i.name.toLowerCase().includes('market')
    );
    
    const onTrack = marketingInitiatives.filter(i => i.status === 'active' && this.isOnTrack(i));
    const atRisk = marketingInitiatives.filter(i => i.status === 'active' && !this.isOnTrack(i) && !this.isBehind(i));
    const behind = marketingInitiatives.filter(i => this.isBehind(i));
    const completed = marketingInitiatives.filter(i => i.status === 'completed');
    
    const recommendedChanges: InitiativeChange[] = [];
    for (const initiative of marketingInitiatives) {
      if (initiative.status === 'active') {
        const roi = initiative.expectedImpact.revenueIncrease / initiative.resources.budget;
        if (roi < 2) {
          recommendedChanges.push({
            initiativeId: initiative.id,
            change: 'pause',
            reason: `Marketing ROI (${roi.toFixed(2)}) below threshold`,
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

  private async assessMarketingResources(context: ExecutiveContext): Promise<ExecutiveAnalysis['resourceAssessment']> {
    const { budget, personnel } = context.resourceAllocation;
    const marketingBudget = budget.byDepartment['marketing'] || 0;
    
    const budgetHealth = marketingBudget > 10000 ? 'healthy' : marketingBudget > 5000 ? 'tight' : 'critical';
    const personnelHealth = (personnel.byRole['marketing'] || 0) >= 2 ? 'healthy' : 'stretched';
    
    return {
      budgetHealth,
      personnelHealth,
      technologyHealth: 'healthy',
      recommendations: [
        {
          type: 'budget',
          action: budgetHealth !== 'healthy' ? 'increase' : 'reallocate',
          amount: 10000,
          reason: 'Marketing needs investment for pipeline generation',
          priority: budgetHealth === 'critical' ? 'high' : 'medium',
        },
      ],
    };
  }

  private async generateMarketingRecommendations(
    business: ExecutiveAnalysis['businessAssessment'],
    market: ExecutiveAnalysis['marketAssessment'],
    initiatives: ExecutiveAnalysis['initiativeAssessment'],
    resources: ExecutiveAnalysis['resourceAssessment']
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Social media automation - KEY FEATURE
    recommendations.push({
      id: `rec-cmo-${Date.now()}-social`,
      category: 'marketing',
      title: 'Deploy Autonomous Social Media Engine (LinkedIn + Twitter)',
      description: 'Use Agent-Reach integration to auto-generate and post audit insights, case studies, and thought leadership daily',
      rationale: 'Social media is highest-ROI channel but manual posting doesn\'t scale. Automation + AI content = 10x output.',
      expectedImpact: { revenueIncrease: 150000, costReduction: 20000, customerAcquisition: 40, retentionImprovement: 0.02, confidence: 0.8 },
      effort: 'medium',
      timeline: '4 weeks',
      owner: 'cmo',
      dependencies: ['cto-api', 'agent-reach-integration'],
      risks: ['Brand voice consistency', 'Platform API limits'],
      metrics: ['Followers', 'Engagement', 'MQLs from social', 'Pipeline $'],
    });
    
    // Content engine
    recommendations.push({
      id: `rec-cmo-${Date.now()}-content`,
      category: 'marketing',
      title: 'Build AI Content Engine for Marketing Pages',
      description: 'Generate landing pages, blog posts, and ad creatives from audit data automatically',
      rationale: 'Content creation is bottleneck. AI-generated pages from audit insights = scalable demand gen.',
      expectedImpact: { revenueIncrease: 200000, costReduction: 30000, customerAcquisition: 60, retentionImprovement: 0.03, confidence: 0.75 },
      effort: 'high',
      timeline: '8 weeks',
      owner: 'cmo',
      dependencies: ['cto-frontend', 'data-pipeline'],
      risks: ['Content quality', 'SEO cannibalization'],
      metrics: ['Pages published', 'Organic traffic', 'Conversion rate'],
    });
    
    // SEO
    recommendations.push({
      id: `rec-cmo-${Date.now()}-seo`,
      category: 'marketing',
      title: 'Aggressive SEO Content Program',
      description: 'Target 50 high-intent keywords with long-form content + programmatic SEO pages',
      rationale: 'Organic traffic is 0 CAC. Current domain authority below competitor average.',
      expectedImpact: { revenueIncrease: 250000, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.7 },
      effort: 'medium',
      timeline: '120 days',
      owner: 'cmo',
      dependencies: ['content-engine'],
      risks: ['Slow results', 'Algorithm changes'],
      metrics: ['Organic traffic', 'Keyword rankings', 'Domain authority'],
    });
    
    // Video
    recommendations.push({
      id: `rec-cmo-${Date.now()}-video`,
      category: 'marketing',
      title: 'Video Content from Audit Reports',
      description: 'Auto-generate short explainer videos from audit findings for social + YouTube',
      rationale: 'Video has 3x engagement of text. Audit data is perfect for "before/after" transformation content.',
      expectedImpact: { revenueIncrease: 80000, costReduction: 0, customerAcquisition: 25, retentionImprovement: 0.01, confidence: 0.65 },
      effort: 'medium',
      timeline: '6 weeks',
      owner: 'cmo',
      dependencies: ['content-engine', 'video-gen-tool'],
      risks: ['Production quality'],
      metrics: ['Video views', 'Engagement', 'Shares'],
    });
    
    return recommendations;
  }

  async makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]> {
    const decisions: ExecutiveDecision[] = [];
    
    // Social media automation decision
    const socialRec = analysis.recommendations.find(r => r.id.includes('social'));
    if (socialRec) {
      const decision = await this.makeDecision(
        socialRec.title,
        socialRec.rationale,
        socialRec.expectedImpact,
        {
          level: 'high',
          risks: socialRec.risks.map(r => ({ risk: r, probability: 0.3, impact: 0.6, category: 'operational' })),
          mitigationStrategies: ['Brand voice guardrails', 'Human review queue', 'Rate limit management'],
          contingencyPlans: ['Pause automation if engagement drops', 'Switch to manual if API blocked'],
        },
        socialRec.dependencies.map(d => ({
          description: d,
          pros: ['Enables automation'],
          cons: ['Dependency'],
          expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.5 },
        }))
      );
      decisions.push(decision);
    }
    
    // Content engine decision
    const contentRec = analysis.recommendations.find(r => r.id.includes('content'));
    if (contentRec) {
      decisions.push(await this.makeDecision(
        contentRec.title,
        contentRec.rationale,
        contentRec.expectedImpact,
        {
          level: 'medium',
          risks: contentRec.risks.map(r => ({ risk: r, probability: 0.4, impact: 0.5, category: 'operational' })),
          mitigationStrategies: ['Editorial review', 'SEO audit', 'Quality scoring'],
          contingencyPlans: ['Manual override', 'Template fallback'],
        },
        []
      ));
    }
    
    return decisions;
  }

  async generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]> {
    const insights: StrategicInsight[] = [];
    const report = await this.generateMarketingReport(this.getContext()!);
    
    // Social automation insight
    if (this.avgSocialGrowth(report.social.followerGrowth) < 0.03) {
      insights.push({
        id: `insight-cmo-${Date.now()}-social`,
        category: 'market',
        insight: `Social growth at ${(this.avgSocialGrowth(report.social.followerGrowth) * 100).toFixed(1)}% - automation needed`,
        evidence: [
          `LinkedIn: ${(report.social.followerGrowth['linkedin'] || 0) * 100}%`,
          `Twitter: ${(report.social.followerGrowth['twitter'] || 0) * 100}%`,
          `Engagement: ${(report.content.avgEngagementRate * 100).toFixed(1)}%`,
        ],
        confidence: 0.85,
        impact: 'high',
        urgency: 'this_month',
        recommendedActions: [
          'Deploy Agent-Reach social automation',
          'Increase posting frequency 3x',
          'A/B test content formats',
          'Engage in industry conversations',
        ],
        owner: 'cmo',
      });
    }
    
    // CAC insight
    if (report.roi.cac > 150) {
      insights.push({
        id: `insight-cmo-${Date.now()}-cac`,
        category: 'market',
        insight: `CAC at $${report.roi.cac} above target - shift to organic`,
        evidence: [
          `Paid CAC: $${report.roi.cac}`,
          `Organic traffic: ${report.seo.organicTraffic}`,
          `Content engagement: ${(report.content.avgEngagementRate * 100).toFixed(1)}%`,
        ],
        confidence: 0.8,
        impact: 'high',
        urgency: 'this_quarter',
        recommendedActions: [
          'Reallocate 30% paid to organic/content',
          'Build SEO content engine',
          'Leverage social automation',
          'Improve landing page conversion',
        ],
        owner: 'cmo',
      });
    }
    
    return insights;
  }

  async createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];
    
    for (const rec of analysis.recommendations.filter(r => r.category === 'marketing')) {
      actions.push({
        id: `action-cmo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // CMO-specific methods for social media automation
  async generateDailySocialContent(context: ExecutiveContext): Promise<SocialContent[]> {
    const auditResults = context.auditResults.slice(0, 5);
    const content: SocialContent[] = [];
    
    for (const audit of auditResults) {
      content.push({
        platform: 'linkedin',
        type: 'insight',
        title: `Website Audit: ${audit.domain}`,
        body: this.contentEngine.generateLinkedInPost(audit, this.brandGuidelines),
        hashtags: ['#WebAudit', '#SEO', '#WebsiteOptimization', '#DigitalMarketing'],
        scheduledTime: this.calculateBestPostTime('linkedin'),
        imagePrompt: this.contentEngine.generateImagePrompt(audit),
        videoPrompt: this.contentEngine.generateVideoPrompt(audit),
      });
      
      content.push({
        platform: 'twitter',
        type: 'thread',
        title: `${audit.domain} Audit Thread`,
        body: this.contentEngine.generateTwitterThread(audit, this.brandGuidelines),
        hashtags: ['#WebAudit', '#SEO'],
        scheduledTime: this.calculateBestPostTime('twitter'),
      });
    }
    
    return content;
  }

  async executeSocialPosting(content: SocialContent[]): Promise<PostingResult> {
    const results: PostResult[] = [];
    
    for (const item of content) {
      try {
        const result = await this.socialAutomation.post(item);
        results.push({ content: item, success: result.success, postId: result.postId, error: result.error });
      } catch (e) {
        results.push({ content: item, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }
    
    return {
      total: content.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  async createMarketingPage(auditResult: AuditSummary): Promise<MarketingPageSpec> {
    return this.contentEngine.generateMarketingPage(auditResult, this.brandGuidelines);
  }

  private calculateBestPostTime(platform: string): string {
    const times: Record<string, string> = {
      linkedin: '09:00',
      twitter: '12:00',
      facebook: '15:00',
      instagram: '18:00',
    };
    return times[platform] || '12:00';
  }

  private loadBrandGuidelines(): BrandGuidelines {
    return {
      voice: 'authoritative yet approachable',
      toneColors: ['#2563EB', '#0F172A', '#10B981'],
      hashtagSet: ['#WebAudit', '#SEO', '#WebsiteOptimization', '#AIAudit'],
      doNotSay: ['guarantee', 'perfect', 'revolutionary'],
      mustInclude: ['data-driven', 'actionable'],
    };
  }

  private async generateMarketingReport(context: ExecutiveContext): Promise<MarketingReport> {
    return {
      campaigns: [
        { id: 'c1', name: 'Q3 LinkedIn Campaign', channel: 'linkedin', status: 'active', spend: 5000, impressions: 250000, clicks: 8500, conversions: 120, cpa: 41.67, roas: 6.2, startDate: '2026-07-01' },
        { id: 'c2', name: 'Google Search', channel: 'google', status: 'active', spend: 8000, impressions: 180000, clicks: 5400, conversions: 95, cpa: 84.2, roas: 4.1, startDate: '2026-07-01' },
      ],
      content: {
        piecesPublished: 45,
        totalViews: 125000,
        totalEngagement: 8200,
        avgEngagementRate: 0.065,
        topPerforming: [{ id: 't1', title: 'Why Your Website Scores 45/100', type: 'blog', platform: 'site', views: 12000, engagement: 950, conversions: 45, revenue: 4500 }],
        contentByType: { blog: 20, video: 15, social: 10 },
      },
      social: {
        followers: { linkedin: 12000, twitter: 8500, youtube: 3200 },
        followerGrowth: { linkedin: 0.08, twitter: 0.05, youtube: 0.03 },
        engagementRate: { linkedin: 0.04, twitter: 0.02, youtube: 0.06 },
        mentions: 450,
        sentiment: { positive: 0.65, neutral: 0.28, negative: 0.07, score: 0.58, trendingTopics: [{ topic: 'AI website audit', mentions: 120, sentiment: 0.7, platforms: ['linkedin', 'twitter'] }] },
        shareOfVoice: 0.15,
      },
      seo: {
        organicTraffic: 28000,
        keywordRankings: [{ keyword: 'website audit tool', position: 8, previousPosition: 12, volume: 12000, difficulty: 65, intent: 'commercial' }],
        backlinks: 850,
        domainAuthority: 42,
        technicalHealth: 88,
        contentGaps: ['website speed audit', 'mobile SEO checker', 'competitor website analysis'],
      },
      brand: {
        brandAwareness: 45,
        brandSentiment: 0.6,
        shareOfVoice: 0.15,
        nps: 52,
        referralRate: 0.18,
      },
      roi: {
        totalSpend: 13000,
        attributedRevenue: 65000,
        cac: 108,
        ltv: 850,
        ltvToCac: 7.87,
        paybackPeriod: 4,
        byChannel: {
          linkedin: { spend: 5000, revenue: 31000, roas: 6.2, cac: 41.67, conversions: 120 },
          google: { spend: 8000, revenue: 34000, roas: 4.1, cac: 84.2, conversions: 95 },
        },
      },
    };
  }
}

// Supporting classes and types
export class ContentEngine {
  generateLinkedInPost(audit: AuditSummary, brand: BrandGuidelines): string {
    const score = audit.scores.overall;
    return `Just audited ${audit.domain} 🔍

Overall Score: ${score}/100
${score < 70 ? '⚠️ Room for improvement' : '✅ Solid foundation'}

Top issues found:
${audit.topIssues.slice(0, 3).map(i => `• ${i.title}`).join('\n')}

Our AI found $${audit.potentialRevenueImpact.toLocaleString()} in revenue opportunities.

Want your site audited? Link below. 👇

#WebAudit #SEO #WebsiteOptimization`;
  }

  generateTwitterThread(audit: AuditSummary, brand: BrandGuidelines): string {
    const score = audit.scores.overall;
    return `1/ 🧵 We just audited ${audit.domain}

Score: ${score}/100

Here's what we found 🧵

2/ SEO: ${audit.scores.seo}/100
Performance: ${audit.scores.performance}/100
Security: ${audit.scores.security}/100

3/ Top fix: ${audit.topIssues[0]?.title || 'N/A'}

Try it free 👇`;
  }

  generateImagePrompt(audit: AuditSummary): string {
    return `Professional infographic showing website audit score ${audit.scores.overall}/100 for ${audit.domain}, modern dashboard style, blue and green gradient, clean minimal design, data visualization`;
  }

  generateVideoPrompt(audit: AuditSummary): string {
    return `30-second explainer video: "Website Audit Reveals ${audit.scores.overall}/100 Score" - animated score gauge, key metrics appearing, call to action. Energetic, professional, blue/green palette.`;
  }

  generateMarketingPage(audit: AuditSummary, brand: BrandGuidelines): MarketingPageSpec {
    return {
      title: `Website Audit Report: ${audit.domain}`,
      slug: `audit-${audit.domain.replace(/\./g, '-')}`,
      sections: [
        { type: 'hero', heading: `Your Website Scores ${audit.scores.overall}/100`, subheading: 'Get a free AI-powered audit' },
        { type: 'scores', scores: audit.scores },
        { type: 'issues', issues: audit.topIssues.slice(0, 5) },
        { type: 'cta', text: 'Start your free audit', button: 'Get Started' },
      ],
      metaTags: { title: `${audit.domain} Website Audit`, description: `See how ${audit.domain} scores on SEO, performance, security and more.` },
      ctaGoal: 'signup',
    };
  }
}

export class SocialMediaAutomation {
  private channels: Record<string, SocialChannel> = {
    linkedin: { name: 'linkedin', rateLimitPerHour: 5, requiresAuth: true, apiEndpoint: 'agent-reach://linkedin' },
    twitter: { name: 'twitter', rateLimitPerHour: 10, requiresAuth: true, apiEndpoint: 'agent-reach://twitter' },
  };

  async post(content: SocialContent): Promise<{ success: boolean; postId?: string; error?: string }> {
    const channel = this.channels[content.platform];
    if (!channel) return { success: false, error: `Unsupported platform: ${content.platform}` };
    
    // In production, this would call Agent-Reach integration
    await new Promise(r => setTimeout(r, 100));
    
    return {
      success: true,
      postId: `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };
  }

  async generateAndPost(content: SocialContent[]): Promise<PostingResult> {
    const results: PostResult[] = [];
    for (const item of content) {
      const result = await this.post(item);
      results.push({ content: item, success: result.success, postId: result.postId, error: result.error });
    }
    return {
      total: content.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString(),
    };
  }
}

interface SocialChannel {
  name: string;
  rateLimitPerHour: number;
  requiresAuth: boolean;
  apiEndpoint: string;
}

export interface SocialContent {
  platform: string;
  type: 'post' | 'thread' | 'insight' | 'video';
  title: string;
  body: string;
  hashtags: string[];
  scheduledTime: string;
  imagePrompt?: string;
  videoPrompt?: string;
}

export interface PostingResult {
  total: number;
  successful: number;
  failed: number;
  results: PostResult[];
  timestamp: string;
}

export interface PostResult {
  content: SocialContent;
  success: boolean;
  postId?: string;
  error?: string;
}

export interface BrandGuidelines {
  voice: string;
  toneColors: string[];
  hashtagSet: string[];
  doNotSay: string[];
  mustInclude: string[];
}

export interface MarketingPageSpec {
  title: string;
  slug: string;
  sections: PageSection[];
  metaTags: { title: string; description: string };
  ctaGoal: string;
}

export interface PageSection {
  type: string;
  heading?: string;
  subheading?: string;
  scores?: ScoresSummary;
  issues?: IssueSummary[];
  text?: string;
  button?: string;
}

export interface CompetitorContent {
  competitor: string;
  topPosts: string[];
  themes: string[];
  engagementRate: number;
}
