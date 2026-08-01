/**
 * Executive AI Team - Base Agent Class
 * Foundation for all executive agents with shared capabilities
 */

import { complete } from '@/lib/llm';
import {
  ExecutiveContext,
  ExecutiveRole,
  ExecutiveDecision,
  AgentCommunication,
  StrategicInsight,
  ActionItem,
  BusinessState,
  MarketConditions,
  Initiative,
  ResourceAllocation,
  ExpectedImpact,
  RiskAssessment,
  InitiativeChange,
  ResourceRecommendation,
  Recommendation,
  AuditSummary,
  MemoryUpdate,
} from './types';
import { executiveState } from './executive-state';
import { getRuntimeLLM } from './runtime-key';

export abstract class BaseExecutiveAgent {
  protected role: ExecutiveRole;
  protected context: ExecutiveContext | null = null;
  protected memory: Map<string, unknown> = new Map();
  private decisionHistory: ExecutiveDecision[] = [];
  private communications: AgentCommunication[] = [];

  constructor(role: ExecutiveRole) {
    this.role = role;
    // Live-update this agent's local memory whenever any agent publishes to the
    // shared brain, so every agent is "updated on the spot".
    executiveState.subscribeMemory((update: MemoryUpdate) => {
      if (update.from !== this.role) {
        this.memory.set(update.key, update.value);
      }
    });
  }

  // Core interface methods - must be implemented by subclasses
  abstract analyze(context: ExecutiveContext): Promise<ExecutiveAnalysis>;
  abstract makeDecisions(analysis: ExecutiveAnalysis): Promise<ExecutiveDecision[]>;
  abstract generateInsights(analysis: ExecutiveAnalysis): Promise<StrategicInsight[]>;
  abstract createActionItems(analysis: ExecutiveAnalysis): Promise<ActionItem[]>;

  // Context management
  setContext(context: ExecutiveContext): void {
    this.context = context;
    this.updateMemory('lastContext', context);
  }

  getContext(): ExecutiveContext | null {
    return this.context;
  }

  // Memory management
  protected updateMemory(key: string, value: unknown): void {
    this.memory.set(key, value);
  }

  protected getMemory<T>(key: string): T | undefined {
    return this.memory.get(key) as T | undefined;
  }

  protected clearMemory(): void {
    this.memory.clear();
  }

  /**
   * Pull the latest shared brain into this agent's local memory so it sees
   * everything other agents have published up to this moment. Called at the
   * start of every analysis so the crew stays synchronized within a single run.
   */
  syncMemory(): void {
    const shared = executiveState.getMemory();
    shared.forEach((value, key) => this.memory.set(key, value));
  }

  /**
   * Publish an important fact to the shared brain and broadcast it to every
   * other agent immediately (they merge it into their local memory via the
   * subscription set up in the constructor).
   */
  shareMemory(key: string, value: unknown): void {
    executiveState.publishMemory(key, value, this.role);
  }

  // Decision making
  protected async makeDecision(
    decision: string,
    rationale: string,
    expectedOutcome: ExpectedImpact,
    risks: RiskAssessment,
    alternatives: { description: string; pros: string[]; cons: string[]; expectedImpact: ExpectedImpact }[]
  ): Promise<ExecutiveDecision> {
    const execDecision: ExecutiveDecision = {
      id: `dec-${this.role}-${Date.now()}`,
      role: this.role,
      decision,
      rationale,
      expectedOutcome,
      riskAssessment: risks,
      alternatives,
      approved: false,
    };

    this.decisionHistory.push(execDecision);
    this.updateMemory('lastDecision', execDecision);
    return execDecision;
  }

  getDecisionHistory(): ExecutiveDecision[] {
    return [...this.decisionHistory];
  }

  // Communication
  protected async sendCommunication(
    to: ExecutiveRole | 'all',
    type: AgentCommunication['type'],
    payload: unknown,
    priority: AgentCommunication['priority'] = 'medium',
    requiresResponse: boolean = false,
    responseDeadline?: string
  ): Promise<AgentCommunication> {
    const comm: AgentCommunication = {
      from: this.role,
      to,
      type,
      payload,
      priority,
      timestamp: new Date().toISOString(),
      requiresResponse,
      responseDeadline,
    };

    this.communications.push(comm);
    this.updateMemory('lastCommunication', comm);
    return comm;
  }

  getCommunications(): AgentCommunication[] {
    return [...this.communications];
  }

  // LLM-powered analysis
  protected async llmAnalyze(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature?: number; maxTokens?: number; json?: boolean } = {}
  ): Promise<string> {
    const context = this.context;
    if (!context) {
      throw new Error('No context available for analysis');
    }

    const enhancedSystemPrompt = `${systemPrompt}

CURRENT CONTEXT:
- Role: ${this.role.toUpperCase()}
- Business State: ${JSON.stringify(context.businessState, null, 2)}
- Market Conditions: ${JSON.stringify(context.marketConditions, null, 2)}
- Active Initiatives: ${JSON.stringify(context.activeInitiatives, null, 2)}
- Resource Allocation: ${JSON.stringify(context.resourceAllocation, null, 2)}

DECISION HISTORY: ${JSON.stringify(this.decisionHistory.slice(-5), null, 2)}`;

    // Runtime override (the browser-entered key sent by the dashboard) takes
    // precedence; otherwise fall back to server env config, then heuristic mode.
    const rt = getRuntimeLLM();
    return complete({
      provider: rt.provider || 'openrouter',
      model: rt.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      apiKey: rt.apiKey || process.env.OPENROUTER_API_KEY || '',
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 2000,
      json: options.json ?? false,
    });
  }

  // Structured LLM analysis with JSON output
  protected async llmAnalyzeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription: string
  ): Promise<T> {
    const result = await this.llmAnalyze(
      `${systemPrompt}

OUTPUT FORMAT: Return ONLY valid JSON matching this schema:
${schemaDescription}

No markdown, no extra text, just the JSON object.`,
      userPrompt,
      { json: true, temperature: 0.2 }
    );

    try {
      return JSON.parse(result);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Failed to parse LLM JSON response: ${result}`);
    }
  }

  // Utility methods for analysis
  protected calculateRevenueOpportunity(audits: AuditSummary[]): number {
    return audits.reduce((sum, audit) => sum + audit.potentialRevenueImpact, 0);
  }

  protected calculateResourceEfficiency(): number {
    if (!this.context) return 0;
    const { budget, personnel } = this.context.resourceAllocation;
    const utilization = personnel.utilization;
    const budgetEfficiency = budget.available > 0 ? 1 - (budget.reserved / budget.total) : 0;
    return (utilization + budgetEfficiency) / 2;
  }

  protected identifyTopPriorities(initiatives: Initiative[]): Initiative[] {
    return initiatives
      .filter(i => i.status === 'active' || i.status === 'planning')
      .sort((a, b) => {
        const scoreA = a.expectedImpact.revenueIncrease * a.priority;
        const scoreB = b.expectedImpact.revenueIncrease * b.priority;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }

  protected assessRiskLevel(impact: number, probability: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = impact * probability;
    if (score > 0.7) return 'critical';
    if (score > 0.4) return 'high';
    if (score > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Composite confidence for an analysis based on business health, market
   * attractiveness and data completeness in the loaded context.
   */
  protected calculateConfidence(
    business: BusinessAssessment,
    market: MarketAssessment
  ): number {
    const businessComponent = (business.healthScore ?? 0) / 100;
    const marketComponent = (market.attractiveness ?? 0) / 100;
    const dataCompleteness = this.context
      ? Math.min(1, (this.context.auditResults.length + this.context.activeInitiatives.length) / 10)
      : 0;
    return Math.round((businessComponent * 0.5 + marketComponent * 0.3 + dataCompleteness * 0.2) * 100) / 100;
  }

  // Abstract method for role-specific system prompt
  protected abstract getSystemPrompt(): string;

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!this.context) {
      issues.push('No context loaded');
    }
    
    if (!process.env.OPENROUTER_API_KEY) {
      issues.push('OPENROUTER_API_KEY not configured');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

// Analysis result type
export interface ExecutiveAnalysis {
  role: ExecutiveRole;
  timestamp: string;
  businessAssessment: BusinessAssessment;
  marketAssessment: MarketAssessment;
  initiativeAssessment: InitiativeAssessment;
  resourceAssessment: ResourceAssessment;
  recommendations: Recommendation[];
  confidence: number;
  strategicInsights?: StrategicInsight[];
}

export interface BusinessAssessment {
  healthScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  keyMetrics: Record<string, { value: number; trend: 'up' | 'down' | 'stable'; target: number }>;
}

export interface MarketAssessment {
  attractiveness: number; // 0-100
  competitivePosition: number; // 0-100
  trends: { trend: string; impact: number; actionable: boolean }[];
  threats: { threat: string; likelihood: number; impact: number }[];
  opportunities: { opportunity: string; effort: number; reward: number }[];
}

export interface InitiativeAssessment {
  onTrack: Initiative[];
  atRisk: Initiative[];
  behind: Initiative[];
  completed: Initiative[];
  recommendedChanges: InitiativeChange[];
}

export interface ResourceAssessment {
  budgetHealth: 'healthy' | 'tight' | 'critical';
  personnelHealth: 'healthy' | 'stretched' | 'overloaded';
  technologyHealth: 'healthy' | 'needs_investment' | 'critical';
  recommendations: ResourceRecommendation[];
}