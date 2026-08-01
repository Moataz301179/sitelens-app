import type {
  Finding, AgentSection, PageSpeedResult, SecurityResult,
  SiteMeta, FeatureFlags, SiteSignals, Competitor,
  DesignConcept, CorrectivePrompt, Stage1Payload,
  LlmEnrichment, Scores, Report, LighthouseCategory,
  LighthouseMetric, LighthouseAudit, SslResult, CorsResult,
  Vulnerability, ChatMessage,
} from "@/lib/schema";

export type {
  Finding, AgentSection, PageSpeedResult, SecurityResult,
  SiteMeta, FeatureFlags, SiteSignals, Competitor,
  DesignConcept, CorrectivePrompt, Stage1Payload,
  LlmEnrichment, Scores, Report, LighthouseCategory,
  LighthouseMetric, LighthouseAudit, SslResult, CorsResult,
  Vulnerability, ChatMessage,
} from "@/lib/schema";

export {
  FindingSchema, AgentSectionSchema, LighthouseCategorySchema,
  LighthouseMetricSchema, LighthouseAuditSchema, PageSpeedResultSchema,
  SslResultSchema, CorsResultSchema, VulnerabilitySchema, SecurityResultSchema,
  SiteMetaSchema, FeatureFlagsSchema, SiteSignalsSchema, CompetitorSchema,
  DesignConceptSchema, CorrectivePromptSchema, Stage1PayloadSchema,
  LlmEnrichmentSchema, IdeaVerdictSchema, BusinessAssessmentSchema,
  NoveltySchema, ScoresSchema, ReportSchema, ChatMessageSchema,
  SeveritySchema, JobStatusSchema, AgentStatusSchema,
  AgentSourceSchema,
} from "@/lib/schema";

export type AgentId = "recon" | "market" | "idea" | "business" | "gaps" | "ux" | "compliance" | "security" | "qa" | "prompts";
export type Severity = "critical" | "warning" | "info" | "pass";

export interface ProviderCreds {
  provider: string;
  model: string;
  apiKey: string;
}

export interface ProviderDef {
  id: string;
  label: string;
  /** No embedded model presets — the full FREE model list is fetched live from OpenRouter. */
  models: string[];
  keyHint: string;
  docsUrl: string;
}

/** Sensible default when the user hasn't picked a model yet. */
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export const PROVIDERS: ProviderDef[] = [
  { id: "openrouter", label: "OpenRouter", models: [], keyHint: "sk-or-v1-…", docsUrl: "https://openrouter.ai/keys" },
];

export interface AuditEvent {
  type: "started" | "agent" | "progress" | "done" | "error";
  analysisId?: string;
  agent?: AgentId;
  status?: "pending" | "running" | "done" | "failed";
  section?: AgentSection;
  report?: Report;
  message?: string;
}
