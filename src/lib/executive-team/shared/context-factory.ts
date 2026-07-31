/**
 * Context Factory — produces a realistic ExecutiveContext for the crew.
 *
 * In production this is hydrated from the live DB (revenue, audits, CRM,
 * market signals). When no live data is available it falls back to a
 * sensible seed so the autonomous engine can still reason and act 24/7.
 */

import { ExecutiveContext, AuditSummary } from './types';

export interface ContextSeed {
  mrr?: number;
  activeCustomers?: number;
  auditsToday?: number;
  openCriticalIssues?: number;
  targetUrl?: string;
}

export function buildExecutiveContext(seed: ContextSeed = {}): ExecutiveContext {
  const mrr = seed.mrr ?? 42000;
  const activeCustomers = seed.activeCustomers ?? 312;
  const auditsToday = seed.auditsToday ?? 84;
  const openCritical = seed.openCriticalIssues ?? 7;

  const auditResults: AuditSummary[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `audit-${Date.now()}-${i}`,
    url: seed.targetUrl ?? 'https://hotelsvendors.com',
    domain: (seed.targetUrl ?? 'hotelsvendors.com').replace(/^https?:\/\//, ''),
    scores: {
      overall: 62 + (i % 5) * 4,
      seo: 58 + i,
      accessibility: 71 - i,
      security: 80 - (i % 3) * 6,
      performance: 66 + (i % 4) * 3,
      bestPractices: 74,
      ux: 60 + (i % 6),
    },
    topIssues: [
      { severity: 'critical', category: 'seo', title: 'Missing meta descriptions', estimatedRevenueImpact: 2400, fixEffort: 'low', autoFixable: true },
      { severity: 'warning', category: 'performance', title: 'Slow TTFB', estimatedRevenueImpact: 1800, fixEffort: 'medium', autoFixable: false },
      { severity: 'critical', category: 'security', title: 'Missing CSP header', estimatedRevenueImpact: 1500, fixEffort: 'low', autoFixable: true },
    ],
    potentialRevenueImpact: 4200 + i * 350,
    recommendedActions: ['Add meta descriptions', 'Enable CSP', 'Edge cache static assets'],
    completedAt: new Date(Date.now() - i * 3600_000).toISOString(),
  }));

  return {
    timestamp: new Date().toISOString(),
    businessState: {
      revenue: {
        monthlyRecurring: mrr,
        annualRecurring: mrr * 12,
        growthRate: 0.14,
        churnRate: 0.032,
        expansionRevenue: 8400,
        newRevenue: 12600,
        averageContractValue: 1610,
        revenueByChannel: { audit: 0.34, paid: 0.22, organic: 0.28, referral: 0.16 },
      },
      costs: {
        totalMonthly: 28000,
        fixedCosts: 16000,
        variableCosts: 12000,
        cac: 420,
        ltv: 2100,
        costBreakdown: { infra: 6500, marketing: 8200, sales: 7100, payroll: 5400, tools: 800 },
      },
      profitability: {
        grossMargin: 0.72,
        netMargin: 0.33,
        ebitda: 13860,
        profitPerCustomer: 44.5,
        paybackPeriod: 4,
        unitEconomics: {
          ltvToCacRatio: 5.0,
          grossMarginPerUser: 151,
          contributionMargin: 0.61,
          breakEvenPoint: 190,
          paybackPeriod: 4,
        },
      },
      growth: {
        userGrowthRate: 0.11,
        revenueGrowthRate: 0.14,
        marketShare: 0.018,
        competitivePosition: 64,
        viralCoefficient: 0.42,
        expansionRevenue: 8400,
      },
      customerMetrics: {
        totalCustomers: activeCustomers,
        activeCustomers,
        newCustomers: 38,
        churnedCustomers: 10,
        averageContractValue: 1610,
        nps: 41,
      },
    },
    marketConditions: {
      industryTrends: [
        { trend: 'AI website auditing demand up', impact: 'positive', confidence: 0.82, timeframe: '12-18mo', sources: ['G2', 'Gartner'] },
        { trend: 'SMBs shifting to self-serve', impact: 'positive', confidence: 0.7, timeframe: '6-12mo', sources: ['a16z'] },
        { trend: 'Price pressure from free tools', impact: 'negative', confidence: 0.6, timeframe: 'ongoing', sources: ['ProductHunt'] },
      ],
      competitorAnalysis: [
        { competitor: 'SiteAudit Pro', marketShare: 0.09, pricing: { model: 'subscription', pricePoints: [49, 149, 399], discounts: ['annual'], packaging: 'tiered' }, strengths: ['brand', 'integrations'], weaknesses: ['slow', 'no agents'], recentMoves: [], threatLevel: 'medium' },
        { competitor: 'Lighthouse+', marketShare: 0.05, pricing: { model: 'freemium', pricePoints: [0, 29], discounts: [], packaging: 'free+tier' }, strengths: ['free'], weaknesses: ['no audit depth'], recentMoves: [], threatLevel: 'low' },
      ],
      marketSize: { tam: 4_200_000_000, sam: 820_000_000, som: 38_000_000, growthRate: 0.19 },
      demandSignals: [
        { signal: 'Hotels seeking vendor onboarding automation', strength: 0.78, source: 'hotelsvendors.com', timestamp: new Date().toISOString(), actionable: true },
        { signal: 'LinkedIn interest in AI website audits', strength: 0.65, source: 'social', timestamp: new Date().toISOString(), actionable: true },
      ],
      seasonalFactors: [{ period: 'Q4', impact: 0.12, description: 'Holiday spend lifts B2B SaaS' }],
      regulatoryEnvironment: [
        { regulation: 'GDPR', impact: 'neutral', complianceCost: 1200, deadline: 'ongoing' },
        { regulation: 'ADA / WCAG', impact: 'negative', complianceCost: 2400, deadline: 'ongoing' },
      ],
    },
    auditResults,
    activeInitiatives: [
      {
        id: 'init-audit-leadmagnet',
        name: 'Audit-as-Lead-Magnet',
        owner: 'cso',
        status: 'active',
        priority: 1,
        expectedImpact: { revenueIncrease: 180000, costReduction: 0, customerAcquisition: 75, retentionImprovement: 0, confidence: 0.85 },
        resources: { budget: 8000, teamMembers: 2, computeResources: 100, externalServices: ['linkedin', 'twitter'] },
        timeline: { startDate: new Date(Date.now() - 20 * 86400_000).toISOString(), targetEndDate: new Date(Date.now() + 25 * 86400_000).toISOString(), milestones: [{ name: 'Launch', targetDate: new Date(Date.now() + 5 * 86400_000).toISOString(), status: 'in_progress', deliverables: ['Flow', 'Copy'] }] },
        dependencies: ['cmo-content'],
        kpis: [{ name: 'Lead→opp', target: 0.25, current: 0.18, unit: 'ratio', frequency: 'weekly' }],
      },
    ],
    resourceAllocation: {
      budget: { total: 95000, byDepartment: { engineering: 32000, marketing: 21000, sales: 18000, operations: 14000, finance: 10000 }, byInitiative: { 'init-audit-leadmagnet': 8000 }, reserved: 15000, available: 14000 },
      personnel: { total: 24, byRole: { eng: 9, sales: 4, marketing: 5, ops: 4, finance: 2 }, utilization: 0.78, hiringPlan: [] },
      technology: {
        computeBudget: 6000, apiBudget: 2500, toolsBudget: 1200,
        infrastructure: { cloudSpend: 4200, cdnSpend: 900, databaseSpend: 800, monitoringSpend: 600 },
      },
    },
  };
}
