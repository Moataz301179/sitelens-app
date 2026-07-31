/**
 * Executive State Store — the shared "brain & memory" for the whole crew.
 *
 * Every agent reads/writes the same store so decisions, communications,
 * insights, action items and measured outcomes stay synchronized across the
 * CEO ↔ COO ↔ CTO ↔ CFO ↔ CMO ↔ CRO agents. The store also keeps a rolling
 * metrics history used to *measure* whether an executed decision actually
 * produced the revenue/impact it promised.
 */

import {
  ExecutiveContext,
  ExecutiveDecision,
  AgentCommunication,
  StrategicInsight,
  ActionItem,
  ExpectedImpact,
  MemoryUpdate,
} from './types';

export type ExecutionStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface MetricSnapshot {
  timestamp: string;
  mrr: number;
  activeCustomers: number;
  pipelineWeighted: number;
  cac: number;
  nps: number;
  auditVolume: number;
  systemUptime: number;
  openIssues: number;
}

export interface ExecutionRecord {
  decisionId: string;
  role: string;
  decision: string;
  status: ExecutionStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  expectedImpact: ExpectedImpact;
  measuredImpact?: ExpectedImpact & { measuredAt: string };
  confirmation?: number; // 0-1 confidence that the outcome was real
}

export interface CrewRun {
  id: string;
  timestamp: string;
  context: ExecutiveContext;
  decisions: ExecutiveDecision[];
  insights: StrategicInsight[];
  actionItems: ActionItem[];
  executions: ExecutionRecord[];
  summary: string;
}

type Listener = (event: string, payload: unknown) => void;

export class ExecutiveState {
  private context: ExecutiveContext | null = null;
  private decisions = new Map<string, ExecutiveDecision>();
  private communications: AgentCommunication[] = [];
  private insights: StrategicInsight[] = [];
  private actionItems = new Map<string, ActionItem>();
  private executions: ExecutionRecord[] = [];
  private history: MetricSnapshot[] = [];
  private runs: CrewRun[] = [];
  private memory = new Map<string, unknown>();
  private listeners: Listener[] = [];
  /** Rolling confirmation scores per role — used to trust/demote agents. */
  private roleConfirmation = new Map<string, number[]>();

  /* ── Context ──────────────────────────────────────────────── */
  setContext(ctx: ExecutiveContext): void {
    this.context = ctx;
    this.emit('context.updated', ctx);
  }
  getContext(): ExecutiveContext | null {
    return this.context;
  }

  /* ── Memory (the shared brain) ────────────────────────────── */
  remember(key: string, value: unknown): void {
    this.memory.set(key, value);
  }
  recall<T>(key: string): T | undefined {
    return this.memory.get(key) as T | undefined;
  }
  getMemory(): Map<string, unknown> {
    return new Map(this.memory);
  }

  /**
   * Publish a memory update to the shared brain AND broadcast it to every
   * agent that subscribes (so they are updated "on the spot", not just at the
   * start of their next run).
   */
  publishMemory(key: string, value: unknown, from: string): MemoryUpdate {
    this.memory.set(key, value);
    const update: MemoryUpdate = { key, value, from: from as MemoryUpdate['from'] };
    this.emit('memory.updated', update);
    return update;
  }

  /** Convenience subscribe for agents that only care about memory changes. */
  subscribeMemory(fn: (update: MemoryUpdate) => void): () => void {
    return this.subscribe((event: string, payload: unknown) => {
      if (event === 'memory.updated') fn(payload as MemoryUpdate);
    });
  }

  /* ── Decisions ────────────────────────────────────────────── */
  recordDecision(d: ExecutiveDecision): void {
    this.decisions.set(d.id, d);
    this.emit('decision.recorded', d);
  }
  getDecisions(): ExecutiveDecision[] {
    return [...this.decisions.values()];
  }
  approveDecision(id: string, by = 'ceo'): ExecutiveDecision | undefined {
    const d = this.decisions.get(id);
    if (d) {
      d.approved = true;
      d.executedBy = by;
      d.executedAt = new Date().toISOString();
      this.emit('decision.approved', d);
    }
    return d;
  }

  /* ── Communications ───────────────────────────────────────── */
  recordCommunication(c: AgentCommunication): void {
    this.communications.push(c);
    this.emit('communication.sent', c);
  }
  getCommunications(): AgentCommunication[] {
    return [...this.communications];
  }

  /* ── Insights ─────────────────────────────────────────────── */
  recordInsight(i: StrategicInsight): void {
    const existing = this.insights.find((x) => x.id === i.id);
    if (!existing) {
      this.insights.push(i);
      this.emit('insight.recorded', i);
    }
  }
  getInsights(): StrategicInsight[] {
    return [...this.insights];
  }

  /* ── Action items ─────────────────────────────────────────── */
  recordActionItem(a: ActionItem): void {
    this.actionItems.set(a.id, a);
    this.emit('action.recorded', a);
  }
  getActionItems(): ActionItem[] {
    return [...this.actionItems.values()];
  }
  updateActionItem(id: string, patch: Partial<ActionItem>): void {
    const a = this.actionItems.get(id);
    if (a) Object.assign(a, patch);
  }

  /* ── Executions & measurement ─────────────────────────────── */
  recordExecution(e: ExecutionRecord): void {
    this.executions.push(e);
    this.emit('execution.recorded', e);
  }
  getExecutions(): ExecutionRecord[] {
    return [...this.executions];
  }
  completeExecution(
    decisionId: string,
    status: ExecutionStatus,
    measuredImpact?: ExpectedImpact
  ): void {
    const e = this.executions.find((x) => x.decisionId === decisionId && x.status === 'running');
    if (!e) return;
    e.status = status;
    e.completedAt = new Date().toISOString();
    let confirmation = 0;
    if (measuredImpact) {
      e.measuredImpact = { ...measuredImpact, measuredAt: e.completedAt };
      confirmation = this.computeConfirmation(e.expectedImpact, measuredImpact);
      e.confirmation = confirmation;
    }
    // Feed the confirmation back into per-role trust so a role that repeatedly
    // produces wrong/no effect is automatically demoted (self-correcting brake).
    this.recordConfirmation(e.role, confirmation);
    this.emit('execution.completed', e);
  }

  /** Record a measured confirmation score (0..1) for a role. */
  recordConfirmation(role: string, score: number): void {
    const arr = this.roleConfirmation.get(role) ?? [];
    arr.push(score);
    if (arr.length > 10) arr.shift();
    this.roleConfirmation.set(role, arr);
  }

  /**
   * Trust gate for autonomous execution. A role is trusted unless its last
   * executions consistently fail measurement (avg confirmation < 0.3 over >=3
   * runs). New roles start trusted so they get a fair chance to prove effect.
   */
  isRoleTrusted(role: string): boolean {
    const arr = this.roleConfirmation.get(role);
    if (!arr || arr.length < 3) return true;
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    return avg >= 0.3;
  }

  /** delta between promised and measured impact → confirmation score 0..1 */
  private computeConfirmation(expected: ExpectedImpact, measured: ExpectedImpact): number {
    const keys: (keyof ExpectedImpact)[] = ['revenueIncrease', 'costReduction', 'customerAcquisition', 'retentionImprovement'];
    let sum = 0;
    let n = 0;
    for (const k of keys) {
      const denom = Math.abs(expected[k]) || 1;
      const ratio = measured[k] / denom;
      sum += Math.max(0, Math.min(1.2, ratio));
      n++;
    }
    return Math.round((sum / n) * 100) / 100;
  }

  /* ── Metrics history (for effect measurement) ─────────────── */
  snapshot(s: Omit<MetricSnapshot, 'timestamp'>): void {
    this.history.push({ ...s, timestamp: new Date().toISOString() });
    if (this.history.length > 500) this.history.shift();
    this.emit('metrics.snapshot', s);
  }
  getHistory(): MetricSnapshot[] {
    return [...this.history];
  }
  baseline(): MetricSnapshot | null {
    return this.history[0] ?? null;
  }
  latest(): MetricSnapshot | null {
    return this.history[this.history.length - 1] ?? null;
  }

  /* ── Runs ─────────────────────────────────────────────────── */
  recordRun(run: CrewRun): void {
    this.runs.push(run);
    if (this.runs.length > 60) this.runs.shift();
  }
  getRuns(): CrewRun[] {
    return [...this.runs];
  }

  /* ── Pub/sub ──────────────────────────────────────────────── */
  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
  private emit(event: string, payload: unknown): void {
    for (const l of this.listeners) {
      try {
        l(event, payload);
      } catch {
        /* listener errors must never break the crew */
      }
    }
  }

  /** Reset volatile state (keeps memory) — used between autonomous cycles */
  resetCycle(): void {
    this.decisions.clear();
    this.actionItems.clear();
    this.insights.length = 0;
    this.communications.length = 0;
    this.executions.length = 0;
  }
}

export const executiveState = new ExecutiveState();
