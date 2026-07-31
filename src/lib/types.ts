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
  models: string[];
  keyHint: string;
  docsUrl: string;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "openrouter", label: "OpenRouter", models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-haiku", "google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat-v3-0324"], keyHint: "sk-or-v1-…", docsUrl: "https://openrouter.ai/keys" },
  { id: "gemini", label: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"], keyHint: "AIza…", docsUrl: "https://aistudio.google.com/apikey" },
  { id: "zai", label: "Z.ai (GLM)", models: ["glm-4.5-flash", "glm-4.5-air", "glm-4-plus"], keyHint: "z.ai API key", docsUrl: "https://z.ai/manage-apikey/apikey-list" },
  { id: "opencode", label: "OpenCode Zen", models: ["openai/gpt-5-nano", "zai-coding-plan/glm-4.7", "minimax/minimax-m2"], keyHint: "sk-… (Zen key)", docsUrl: "https://opencode.ai/zen" },
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
