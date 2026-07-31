/**
 * Executive AI Team — public surface.
 * Import from here instead of deep paths:
 *   import { coordinator, engine, executiveState, dailyReportBuilder, agentReach } from '@/lib/executive-team';
 */

export { CEOAgent } from './ceo/ceo-agent';
export { COOAgent } from './coo/coo-agent';
export { CTOAgent } from './cto/cto-agent';
export { CFOAgent } from './cfo/cfo-agent';
export { CMOAgent } from './cmo/cmo-agent';
export { CROAgent } from './cro/cro-agent';
export { CIOAgent } from './cio/cio-agent';

export { ExecutiveCoordinator, coordinator } from './coordinator/coordinator';
export { AutonomousEngine, engine } from './autonomy/engine';
export { DailyReportBuilder, dailyReportBuilder } from './reporting/daily-report';
export { AgentReachClient, agentReach } from './social/agent-reach-client';
export { MetaAdsClient } from './social/meta-ads-client';
export { ExecutiveState, executiveState } from './shared/executive-state';
export { buildExecutiveContext } from './shared/context-factory';
export { SyntheticAgent } from './shared/synthetic-agent';
export { SWEAgent, softwareEngineer } from './swe/swe-agent';
export type { ImplementationResult, ApplyMode } from './swe/swe-agent';
export { codebaseLedger } from './knowledge/codebase-ledger';
export type { Ledger, RefinementEntry, PatternEntry, RefinementStatus } from './knowledge/codebase-ledger';
// Bridge so app code can point the crew at a live site without reaching into /scripts.
export { contextForSite } from '../../../scripts/audit-to-context';
export * from './shared/types';
export { BaseExecutiveAgent } from './shared/base-agent';
export type { ExecutiveAnalysis } from './shared/base-agent';
