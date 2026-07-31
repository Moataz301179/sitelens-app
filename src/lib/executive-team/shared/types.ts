/**
 * Executive AI Team - Shared Types
 * Core types for the autonomous business intelligence system
 */

export interface ExecutiveContext {
  timestamp: string;
  businessState: BusinessState;
  marketConditions: MarketConditions;
  auditResults: AuditSummary[];
  activeInitiatives: Initiative[];
  resourceAllocation: ResourceAllocation;
}

export interface BusinessState {
  revenue: RevenueMetrics;
  costs: CostMetrics;
  profitability: ProfitabilityMetrics;
  growth: GrowthMetrics;
  customerMetrics: CustomerMetrics;
}

export interface RevenueMetrics {
  monthlyRecurring: number;
  annualRecurring: number;
  growthRate: number;
  churnRate: number;
  expansionRevenue: number;
  newRevenue: number;
  averageContractValue: number;
  revenueByChannel: Record<string, number>;
}

export interface CostMetrics {
  totalMonthly: number;
  fixedCosts: number;
  variableCosts: number;
  cac: number; // Customer Acquisition Cost
  ltv: number; // Lifetime Value
  costBreakdown: Record<string, number>;
}

export interface ProfitabilityMetrics {
  grossMargin: number;
  netMargin: number;
  ebitda: number;
  profitPerCustomer: number;
  paybackPeriod: number; // months
  unitEconomics: UnitEconomics;
}

export interface UnitEconomics {
  ltvToCacRatio: number;
  grossMarginPerUser: number;
  contributionMargin: number;
  breakEvenPoint: number;
  paybackPeriod: number;
}

export interface GrowthMetrics {
  userGrowthRate: number;
  revenueGrowthRate: number;
  marketShare: number;
  competitivePosition: number;
  viralCoefficient: number;
  expansionRevenue: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  averageContractValue: number;
  nps: number; // Net Promoter Score
}

export interface MarketConditions {
  industryTrends: IndustryTrend[];
  competitorAnalysis: CompetitorIntelligence[];
  marketSize: MarketSizeData;
  demandSignals: DemandSignal[];
  seasonalFactors: SeasonalFactor[];
  regulatoryEnvironment: RegulatoryFactor[];
}

export interface IndustryTrend {
  trend: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  timeframe: string;
  sources: string[];
}

export interface CompetitorIntelligence {
  competitor: string;
  marketShare: number;
  pricing: PricingIntelligence;
  strengths: string[];
  weaknesses: string[];
  recentMoves: CompetitorMove[];
  threatLevel: 'high' | 'medium' | 'low';
}

export interface PricingIntelligence {
  model: string;
  pricePoints: number[];
  discounts: string[];
  packaging: string;
}

export interface CompetitorMove {
  date: string;
  action: string;
  impact: string;
  ourResponse?: string;
}

export interface MarketSizeData {
  tam: number; // Total Addressable Market
  sam: number; // Serviceable Addressable Market
  som: number; // Serviceable Obtainable Market
  growthRate: number;
}

export interface DemandSignal {
  signal: string;
  strength: number;
  source: string;
  timestamp: string;
  actionable: boolean;
}

export interface SeasonalFactor {
  period: string;
  impact: number;
  description: string;
}

export interface RegulatoryFactor {
  regulation: string;
  impact: 'positive' | 'negative' | 'neutral';
  complianceCost: number;
  deadline?: string;
}

export interface AuditSummary {
  id: string;
  url: string;
  domain: string;
  scores: ScoresSummary;
  topIssues: IssueSummary[];
  potentialRevenueImpact: number;
  recommendedActions: string[];
  completedAt: string;
}

export interface ScoresSummary {
  overall: number;
  seo: number;
  accessibility: number;
  security: number;
  performance: number;
  bestPractices: number;
  ux: number;
}

export interface IssueSummary {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  estimatedRevenueImpact: number;
  fixEffort: 'low' | 'medium' | 'high';
  autoFixable: boolean;
}

export interface Initiative {
  id: string;
  name: string;
  owner: ExecutiveRole;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'failed';
  priority: number;
  expectedImpact: ExpectedImpact;
  actualImpact?: ActualImpact;
  resources: ResourceCommitment;
  timeline: Timeline;
  dependencies: string[];
  kpis: KPI[];
}

export interface ExpectedImpact {
  revenueIncrease: number;
  costReduction: number;
  customerAcquisition: number;
  retentionImprovement: number;
  confidence: number;
}

export interface ActualImpact {
  revenueIncrease: number;
  costReduction: number;
  customerAcquisition: number;
  retentionImprovement: number;
  measuredAt: string;
}

export interface ResourceCommitment {
  budget: number;
  teamMembers: number;
  computeResources: number;
  externalServices: string[];
}

export interface Timeline {
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  deliverables: string[];
}

export interface KPI {
  name: string;
  target: number;
  current: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface ResourceAllocation {
  budget: BudgetAllocation;
  personnel: PersonnelAllocation;
  technology: TechnologyAllocation;
}

export interface BudgetAllocation {
  total: number;
  byDepartment: Record<string, number>;
  byInitiative: Record<string, number>;
  reserved: number;
  available: number;
}

export interface PersonnelAllocation {
  total: number;
  byRole: Record<string, number>;
  utilization: number;
  hiringPlan: HiringPlan[];
}

export interface HiringPlan {
  role: string;
  count: number;
  targetDate: string;
  budget: number;
  status: 'planned' | 'recruiting' | 'hired';
}

export interface TechnologyAllocation {
  computeBudget: number;
  apiBudget: number;
  toolsBudget: number;
  infrastructure: InfrastructureAllocation;
}

export interface InfrastructureAllocation {
  cloudSpend: number;
  cdnSpend: number;
  databaseSpend: number;
  monitoringSpend: number;
}

export type ExecutiveRole = 
  | 'ceo' 
  | 'coo' 
  | 'cto' 
  | 'cfo' 
  | 'cmo' 
  | 'cso' 
  | 'vp_engineering' 
  | 'vp_marketing' 
  | 'vp_sales' 
  | 'vp_product' 
  | 'vp_customer_success'
  | 'cio'
  | 'swe';

export interface ExecutiveDecision {
  id: string;
  role: ExecutiveRole;
  decision: string;
  rationale: string;
  expectedOutcome: ExpectedImpact;
  riskAssessment: RiskAssessment;
  alternatives: Alternative[];
  approved: boolean;
  executedAt?: string;
  executedBy?: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  risks: IdentifiedRisk[];
  mitigationStrategies: string[];
  contingencyPlans: string[];
}

export interface IdentifiedRisk {
  risk: string;
  probability: number;
  impact: number;
  category: 'financial' | 'operational' | 'strategic' | 'compliance' | 'reputational' | 'technical';
}

export interface Alternative {
  description: string;
  pros: string[];
  cons: string[];
  expectedImpact: ExpectedImpact;
}

export interface AgentCommunication {
  from: ExecutiveRole;
  to: ExecutiveRole | 'all';
  type: 'decision' | 'request' | 'update' | 'alert' | 'recommendation';
  payload: unknown;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  requiresResponse: boolean;
  responseDeadline?: string;
}

export interface DailyReport {
  date: string;
  executiveSummary: ExecutiveSummary;
  financials: FinancialReport;
  operations: OperationsReport;
  marketing: MarketingReport;
  sales: SalesReport;
  technology: TechnologyReport;
  customerSuccess: CustomerSuccessReport;
  strategicInsights: StrategicInsight[];
  actionItems: ActionItem[];
}

export interface ExecutiveSummary {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  keyAchievements: string[];
  criticalIssues: string[];
  revenueVsTarget: number;
  profitVsTarget: number;
  topPriority: string;
  outlook: 'bullish' | 'cautiously_optimistic' | 'neutral' | 'bearish';
}

export interface FinancialReport {
  revenue: RevenueMetrics;
  costs: CostMetrics;
  profitability: ProfitabilityMetrics;
  cashFlow: CashFlowMetrics;
  forecasts: FinancialForecast[];
  variances: VarianceAnalysis[];
}

export interface CashFlowMetrics {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  runway: number; // months
  burnRate: number;
}

export interface FinancialForecast {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
  confidence: number;
  assumptions: string[];
}

export interface VarianceAnalysis {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  explanation: string;
}

export interface OperationsReport {
  systemHealth: SystemHealthMetrics;
  auditVolume: AuditVolumeMetrics;
  teamPerformance: TeamPerformanceMetrics;
  processEfficiency: ProcessEfficiencyMetrics;
  incidents: Incident[];
}

export interface SystemHealthMetrics {
  uptime: number;
  avgResponseTime: number;
  errorRate: number;
  throughput: number;
  capacityUtilization: number;
}

export interface AuditVolumeMetrics {
  totalAudits: number;
  completedAudits: number;
  failedAudits: number;
  avgAuditTime: number;
  auditsByType: Record<string, number>;
  revenueFromAudits: number;
}

export interface TeamPerformanceMetrics {
  agentEfficiency: Record<string, number>;
  taskCompletionRate: number;
  avgTaskTime: number;
  qualityScore: number;
  utilization: number;
}

export interface ProcessEfficiencyMetrics {
  automationRate: number;
  manualInterventions: number;
  cycleTime: number;
  defectRate: number;
}

export interface Incident {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'postmortem';
  impact: string;
  resolution?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface MarketingReport {
  campaigns: CampaignMetrics[];
  content: ContentMetrics;
  social: SocialMetrics;
  seo: SEOMetrics;
  brand: BrandMetrics;
  roi: MarketingROI;
}

export interface CampaignMetrics {
  id: string;
  name: string;
  channel: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number; // Cost per Acquisition
  roas: number; // Return on Ad Spend
  startDate: string;
  endDate?: string;
}

export interface ContentMetrics {
  piecesPublished: number;
  totalViews: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerforming: TopContent[];
  contentByType: Record<string, number>;
}

export interface TopContent {
  id: string;
  title: string;
  type: string;
  platform: string;
  views: number;
  engagement: number;
  conversions: number;
  revenue: number;
}

export interface SocialMetrics {
  followers: Record<string, number>;
  followerGrowth: Record<string, number>;
  engagementRate: Record<string, number>;
  mentions: number;
  sentiment: SentimentAnalysis;
  shareOfVoice: number;
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  score: number; // -1 to 1
  trendingTopics: TrendingTopic[];
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  sentiment: number;
  platforms: string[];
}

export interface SEOMetrics {
  organicTraffic: number;
  keywordRankings: KeywordRanking[];
  backlinks: number;
  domainAuthority: number;
  technicalHealth: number;
  contentGaps: string[];
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  previousPosition: number;
  volume: number;
  difficulty: number;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface BrandMetrics {
  brandAwareness: number;
  brandSentiment: number;
  shareOfVoice: number;
  nps: number;
  referralRate: number;
}

export interface MarketingROI {
  totalSpend: number;
  attributedRevenue: number;
  cac: number;
  ltv: number;
  ltvToCac: number;
  paybackPeriod: number;
  byChannel: Record<string, ChannelROI>;
}

export interface ChannelROI {
  spend: number;
  revenue: number;
  roas: number;
  cac: number;
  conversions: number;
}

export interface SalesReport {
  pipeline: PipelineMetrics;
  performance: SalesPerformanceMetrics;
  forecasting: SalesForecast[];
  activities: SalesActivityMetrics;
  conversion: ConversionMetrics;
}

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  byStage: Record<string, PipelineStage>;
  newOpportunities: number;
  closedWon: number;
  closedLost: number;
  avgDealSize: number;
  salesCycleLength: number;
}

export interface PipelineStage {
  name: string;
  count: number;
  value: number;
  weightedValue: number;
  conversionRate: number;
  avgDaysInStage: number;
}

export interface SalesPerformanceMetrics {
  quotaAttainment: number;
  avgQuotaAttainment: number;
  topPerformers: SalesRepPerformance[];
  activitiesPerRep: number;
  winRate: number;
  avgDealSize: number;
}

export interface SalesRepPerformance {
  rep: string;
  quota: number;
  attainment: number;
  dealsClosed: number;
  pipelineGenerated: number;
  activities: number;
}

export interface SalesForecast {
  period: string;
  commit: number;
  bestCase: number;
  worstCase: number;
  confidence: number;
  methodology: string;
}

export interface SalesActivityMetrics {
  calls: number;
  emails: number;
  meetings: number;
  demos: number;
  proposals: number;
  byRep: Record<string, ActivityCounts>;
}

export interface ActivityCounts {
  calls: number;
  emails: number;
  meetings: number;
  demos: number;
  proposals: number;
}

export interface ConversionMetrics {
  leadToOpportunity: number;
  opportunityToClose: number;
  overallConversion: number;
  bySource: Record<string, number>;
  bySegment: Record<string, number>;
  timeToConvert: number;
}

export interface TechnologyReport {
  infrastructure: InfrastructureMetrics;
  development: DevelopmentMetrics;
  security: SecurityMetrics;
  innovation: InnovationMetrics;
  technicalDebt: TechnicalDebtMetrics;
}

export interface InfrastructureMetrics {
  uptime: number;
  latency: LatencyMetrics;
  costs: InfrastructureCosts;
  scaling: ScalingMetrics;
  incidents: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
}

export interface InfrastructureCosts {
  compute: number;
  storage: number;
  network: number;
  cdn: number;
  total: number;
  perAudit: number;
}

export interface ScalingMetrics {
  currentCapacity: number;
  peakUtilization: number;
  autoScaleEvents: number;
  projectedNeeds: number;
}

export interface DevelopmentMetrics {
  velocity: number;
  quality: number;
  deploymentFrequency: number;
  leadTime: number;
  mttr: number; // Mean Time To Recovery
  changeFailureRate: number;
  codeCoverage: number;
  technicalDebtRatio: number;
}

export interface SecurityMetrics {
  vulnerabilities: VulnerabilityMetrics;
  compliance: ComplianceMetrics;
  incidents: SecurityIncident[];
  audits: SecurityAudit[];
}

export interface VulnerabilityMetrics {
  critical: number;
  high: number;
  medium: number;
  low: number;
  meanTimeToPatch: number;
}

export interface ComplianceMetrics {
  frameworks: Record<string, ComplianceStatus>;
  gaps: number;
  remediationInProgress: number;
}

export interface ComplianceStatus {
  status: 'compliant' | 'partial' | 'non_compliant';
  score: number;
  lastAudit: string;
  nextAudit: string;
}

export interface SecurityIncident {
  id: string;
  severity: string;
  description: string;
  status: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface SecurityAudit {
  type: string;
  score: number;
  findings: number;
  date: string;
}

export interface InnovationMetrics {
  rAndDSpend: number;
  experimentsRunning: number;
  experimentsCompleted: number;
  successfulExperiments: number;
  patentsFiled: number;
  newTechnologiesAdopted: string[];
}

export interface TechnicalDebtMetrics {
  totalDebt: number;
  debtRatio: number;
  byCategory: [string, number][];
  remediationPlan: RemediationItem[];
}

export interface RemediationItem {
  item: string;
  effort: number;
  impact: number;
  priority: number;
  targetDate: string;
}

export interface CustomerSuccessReport {
  health: CustomerHealthMetrics;
  retention: RetentionMetrics;
  expansion: ExpansionMetrics;
  support: SupportMetrics;
  feedback: FeedbackMetrics;
}

export interface CustomerHealthMetrics {
  healthy: number;
  atRisk: number;
  critical: number;
  activeCustomers: number;
  avgHealthScore: number;
  churnRisk: number;
}

export interface RetentionMetrics {
  grossRetention: number;
  netRetention: number;
  logoRetention: number;
  churnRate: number;
  churnReasons: Record<string, number>;
}

export interface ExpansionMetrics {
  expansionRevenue: number;
  expansionRate: number;
  upsellRate: number;
  crossSellRate: number;
  avgExpansionDealSize: number;
}

export interface SupportMetrics {
  tickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  csat: number;
  nps: number;
  selfServiceRate: number;
}

export interface FeedbackMetrics {
  nps: number;
  csat: number;
  featureRequests: number;
  bugReports: number;
  topThemes: string[];
}

export interface StrategicInsight {
  id: string;
  category: 'market' | 'competitive' | 'financial' | 'operational' | 'technological' | 'customer';
  insight: string;
  evidence: string[];
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'this_week' | 'this_month' | 'this_quarter';
  recommendedActions: string[];
  owner: ExecutiveRole;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  owner: ExecutiveRole;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  estimatedImpact: ExpectedImpact;
}
/* ── Shared recommendation / initiative / resource types ── */

export interface InitiativeChange {
  initiativeId: string;
  change: 'accelerate' | 'decelerate' | 'pivot' | 'pause' | 'cancel' | 'add_resources' | 'reduce_resources';
  reason: string;
  expectedImpact: ExpectedImpact;
}

export interface ResourceRecommendation {
  type: 'budget' | 'personnel' | 'technology';
  action: 'increase' | 'decrease' | 'reallocate';
  amount: number;
  from?: string;
  to?: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  id: string;
  category: 'strategic' | 'tactical' | 'operational' | 'financial' | 'technical' | 'marketing' | 'sales';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: ExpectedImpact;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  owner: ExecutiveRole;
  dependencies: string[];
  risks: string[];
  metrics: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// ---------------------------------------------------------------------------
// Dynamic role creation (CEO appoints new roles for missing scopes)
// ---------------------------------------------------------------------------

export interface RoleSpec {
  id: string;
  title: string;
  mandate: string;
  systemPrompt: string;
  objectives: string[];
  successMetrics: string[];
  createdBy: ExecutiveRole;
  domain: string;
}

// ---------------------------------------------------------------------------
// Opportunity radar (Intelligence Officer identifies, COO validates/executes)
// ---------------------------------------------------------------------------

export type OpportunityType = 'affiliate' | 'dropship' | 'shipping' | 'partnership' | 'other';

export interface ValidationTest {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  detail: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0..100 business-logic / validation score
  tests: ValidationTest[];
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  applicability: number; // 0..1 fit for the current business
  estimatedValue: number; // monthly $ impact estimate
  risks: string[];
  validation?: ValidationResult;
  identifiedBy: ExecutiveRole;
}

// ---------------------------------------------------------------------------
// Shared-memory bus event payloads
// ---------------------------------------------------------------------------

export interface MemoryUpdate {
  key: string;
  value: unknown;
  from: ExecutiveRole;
}
