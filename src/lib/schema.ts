import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 1. Core enums                                                       */
/* ------------------------------------------------------------------ */

export const SeveritySchema = z.enum(["critical", "warning", "info", "pass"]);
export const JobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export const AgentStatusSchema = z.enum(["pending", "running", "done", "failed"]);
export const AgentSourceSchema = z.enum(["heuristic", "ai", "hybrid"]);

/* ------------------------------------------------------------------ */
/* 2. Finding & Agent schemas                                          */
/* ------------------------------------------------------------------ */

export const FindingSchema = z.object({
  id: z.string().min(1),
  agent: z.enum([
    "recon", "market", "idea", "business", "gaps",
    "ux", "compliance", "security", "qa", "prompts",
  ]),
  severity: SeveritySchema,
  title: z.string().min(1).max(300),
  detail: z.string().max(2000).default(""),
  fix: z.string().max(1000).default(""),
  ghQuery: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
});

export const AgentSectionSchema = z.object({
  id: z.enum([
    "recon", "market", "idea", "business", "gaps",
    "ux", "compliance", "security", "qa", "prompts",
  ]),
  name: z.string().min(1),
  role: z.string().min(1),
  status: AgentStatusSchema,
  source: AgentSourceSchema,
  summary: z.string().max(3000),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  findings: z.array(FindingSchema).default([]),
  insights: z.array(z.string().max(500)).default([]),
});

/* ------------------------------------------------------------------ */
/* 3. Lighthouse metrics from PageSpeed Insights                       */
/* ------------------------------------------------------------------ */

export const LighthouseCategorySchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(100),
  title: z.string(),
});

export const LighthouseMetricSchema = z.object({
  id: z.string(),
  value: z.number(),
  displayValue: z.string(),
  score: z.number().nullable(),
});

export const LighthouseAuditSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number().nullable(),
  scoreDisplayMode: z.string(),
  description: z.string().nullable(),
  details: z.unknown().nullable().optional(),
});

export const PageSpeedResultSchema = z.object({
  performance: z.number().min(0).max(100),
  accessibility: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  bestPractices: z.number().min(0).max(100),
  pwa: z.number().min(0).max(100),
  categories: z.array(LighthouseCategorySchema),
  metrics: z.array(LighthouseMetricSchema),
  audits: z.array(LighthouseAuditSchema),
  loadingExperience: z.unknown().nullable().optional(),
  screenshot: z.object({
    data: z.string(),
    mimeType: z.string(),
  }).nullable().optional(),
  finalUrl: z.string().url(),
  strategy: z.enum(["mobile", "desktop"]),
  fetchedAt: z.string(),
});

/* ------------------------------------------------------------------ */
/* 4. Security audit results                                           */
/* ------------------------------------------------------------------ */

export const SslResultSchema = z.object({
  valid: z.boolean(),
  daysUntilExpiry: z.number().nullable(),
  issuer: z.string().nullable(),
  protocol: z.string().nullable(),
});

export const CorsResultSchema = z.object({
  configured: z.boolean(),
  origin: z.string().nullable(),
  methods: z.array(z.string()).nullable(),
  exposedHeaders: z.array(z.string()).nullable(),
  allowsCredentials: z.boolean().nullable(),
  issues: z.array(z.string()).default([]),
});

export const VulnerabilitySchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  package: z.string(),
  version: z.string().nullable(),
  cveIds: z.array(z.string()).default([]),
  fix: z.string().nullable(),
});

export const SecurityResultSchema = z.object({
  ssl: SslResultSchema.nullable(),
  headers: z.array(z.object({ name: z.string(), present: z.boolean(), value: z.string().nullable() })),
  cors: CorsResultSchema.nullable(),
  vulnerabilities: z.array(VulnerabilitySchema).default([]),
  sourceMaps: z.array(z.object({ url: z.string(), size: z.number().nullable() })).default([]),
  sensitiveComments: z.array(z.string()).default([]),
  mixedContent: z.number().default(0),
  score: z.number().min(0).max(100),
});

/* ------------------------------------------------------------------ */
/* 5. Site metadata & heuristics                                       */
/* ------------------------------------------------------------------ */

export const SiteMetaSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  ogImage: z.string().nullable(),
  themeColor: z.string().nullable(),
  lang: z.string().nullable(),
  wordCount: z.number().default(0),
});

export const FeatureFlagsSchema = z.object({
  pricing: z.boolean().default(false),
  signup: z.boolean().default(false),
  login: z.boolean().default(false),
  cart: z.boolean().default(false),
  blog: z.boolean().default(false),
  docs: z.boolean().default(false),
  search: z.boolean().default(false),
  analytics: z.boolean().default(false),
  payments: z.boolean().default(false),
  liveChat: z.boolean().default(false),
});

/* Connected apps / third-party integrations detected on the page */
export const ConnectedAppSchema = z.object({
  name: z.string(),
  category: z.string(),
  evidence: z.string().optional(),
});
export type ConnectedApp = z.infer<typeof ConnectedAppSchema>;

export const SiteSignalsSchema = z.object({
  url: z.string().url(),
  finalUrl: z.string().url(),
  status: z.number(),
  https: z.boolean(),
  fetchMs: z.number(),
  sizeKb: z.number(),
  meta: SiteMetaSchema,
  h1Count: z.number().default(0),
  h1Text: z.string().default(""),
  headingOrderOk: z.boolean().default(true),
  imgTotal: z.number().default(0),
  imgMissingAlt: z.number().default(0),
  linksInternal: z.number().default(0),
  linksExternal: z.number().default(0),
  scripts: z.number().default(0),
  stylesheets: z.number().default(0),
  forms: z.number().default(0),
  inputsNoLabel: z.number().default(0),
  ariaCount: z.number().default(0),
  jsonLd: z.number().default(0),
  hasViewport: z.boolean().default(false),
  hasCharset: z.boolean().default(false),
  hasFavicon: z.boolean().default(false),
  hasCanonical: z.boolean().default(false),
  hasRobotsNoindex: z.boolean().default(false),
  hasDoctype: z.boolean().default(false),
  hasPrivacyLink: z.boolean().default(false),
  hasTermsLink: z.boolean().default(false),
  cookieMention: z.boolean().default(false),
  duplicateIds: z.number().default(0),
  loremHits: z.number().default(0),
  todoComments: z.number().default(0),
  mixedContent: z.number().default(0),
  inlineHandlers: z.number().default(0),
  emptyHashLinks: z.number().default(0),
  wordCount: z.number().default(0),
  ctaCount: z.number().default(0),
  tech: z.array(z.string()).default([]),
  features: FeatureFlagsSchema,
  brandColor: z.string().nullable(),
  html: z.string().default(""),
  headers: z.record(z.string(), z.string()).default({}),
  landmarks: z.object({ header: z.boolean(), nav: z.boolean(), main: z.boolean(), footer: z.boolean() }).default({ header: false, nav: false, main: false, footer: false }),
  connectedApps: z.array(ConnectedAppSchema).default([]),
});

/* ------------------------------------------------------------------ */
/* 6. Competitor, design concept, corrective prompt                    */
/* ------------------------------------------------------------------ */

export const CompetitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().nullable().optional(),
  positioning: z.string().default("—"),
  overlap: z.string().default("—"),
  differentiation: z.string().default("—"),
  threat: z.enum(["high", "medium", "low"]).default("medium"),
});

export const DesignConceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  style: z.enum(["conversion", "editorial", "bold"]),
  rationale: z.string().max(1000),
  changes: z.array(z.string().max(200)).default([]),
  palette: z.object({
    bg: z.string(),
    surface: z.string(),
    text: z.string(),
    accent: z.string(),
    muted: z.string(),
  }),
});

export const CorrectivePromptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(300),
  target: z.string().min(1),
  prompt: z.string().min(10),
});

/* ------------------------------------------------------------------ */
/* 7. Stage 1 data payload (data gathering)                            */
/* ------------------------------------------------------------------ */

export const Stage1PayloadSchema = z.object({
  url: z.string().url(),
  domain: z.string().min(1),
  finalUrl: z.string().url(),
  fetchedAt: z.string(),
  fetchMs: z.number(),
  sizeKb: z.number(),
  status: z.number(),
  https: z.boolean(),
  tech: z.array(z.string()),
  meta: SiteMetaSchema,
  features: FeatureFlagsSchema,
  siteSignals: SiteSignalsSchema,
  lighthouse: PageSpeedResultSchema.nullable(),
  security: SecurityResultSchema.nullable(),
  category: z.string().default("General Web"),
});

/* ------------------------------------------------------------------ */
/* 8. Stage 2 enrichment (LLM synthesis)                               */
/* ------------------------------------------------------------------ */

export const IdeaVerdictSchema = z.object({
  verdict: z.enum(["validated", "plausible", "risky"]),
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().max(500)).default([]),
  risks: z.array(z.string().max(500)).default([]),
});

export const BusinessAssessmentSchema = z.object({
  assessment: z.string().max(1000),
  suggestions: z.array(z.string().max(500)).default([]),
});

export const NoveltySchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string().max(500),
  notes: z.array(z.string().max(300)).default([]),
});

export const LlmEnrichmentSchema = z.object({
  marketAnalysis: z.string().max(2000).default(""),
  competitors: z.array(CompetitorSchema).default([]),
  gaps: z.array(z.string().max(500)).default([]),
  idea: IdeaVerdictSchema.nullable().optional(),
  business: BusinessAssessmentSchema.nullable().optional(),
  uxNotes: z.array(z.object({
    title: z.string(),
    issue: z.string(),
    improvement: z.string(),
  })).default([]),
  violations: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    remediation: z.string(),
  })).default([]),
  bugCandidates: z.array(z.object({
    title: z.string(),
    detail: z.string(),
  })).default([]),
  novelty: NoveltySchema.nullable().optional(),
  correctivePrompts: z.array(z.object({
    title: z.string(),
    prompt: z.string(),
  })).default([]),
});

/* ------------------------------------------------------------------ */
/* 9. Final Report (what the client receives)                          */
/* ------------------------------------------------------------------ */

export const ScoresSchema = z.object({
  overall: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  accessibility: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  performance: z.number().min(0).max(100),
  bestPractices: z.number().min(0).max(100),
  ux: z.number().min(0).max(100),
});

export const ReportSchema = z.object({
  url: z.string().url(),
  domain: z.string().min(1),
  finalUrl: z.string().url(),
  fetchedAt: z.string(),
  fetchMs: z.number(),
  sizeKb: z.number(),
  https: z.boolean(),
  status: z.number(),
  tech: z.array(z.string()),
  headers: z.array(z.object({ name: z.string(), present: z.boolean(), value: z.string().nullable() })),
  meta: SiteMetaSchema,
  scores: ScoresSchema,
  agents: z.array(AgentSectionSchema),
  competitors: z.array(CompetitorSchema),
  concepts: z.array(DesignConceptSchema),
  prompts: z.array(CorrectivePromptSchema),
  novelty: NoveltySchema,
  llm: z.object({ provider: z.string(), model: z.string() }).nullable(),
  category: z.string(),
  lighthouse: PageSpeedResultSchema.nullable().optional(),
  security: SecurityResultSchema.nullable().optional(),
  screenshot: z.string().nullable().optional(),
  connectedApps: z.array(ConnectedAppSchema).default([]),
});

export type Finding = z.infer<typeof FindingSchema>;
export type AgentSection = z.infer<typeof AgentSectionSchema>;
export type PageSpeedResult = z.infer<typeof PageSpeedResultSchema>;
export type SecurityResult = z.infer<typeof SecurityResultSchema>;
export type SiteMeta = z.infer<typeof SiteMetaSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type SiteSignals = z.infer<typeof SiteSignalsSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
export type DesignConcept = z.infer<typeof DesignConceptSchema>;
export type CorrectivePrompt = z.infer<typeof CorrectivePromptSchema>;
export type Stage1Payload = z.infer<typeof Stage1PayloadSchema>;
export type LlmEnrichment = z.infer<typeof LlmEnrichmentSchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type LighthouseCategory = z.infer<typeof LighthouseCategorySchema>;
export type LighthouseMetric = z.infer<typeof LighthouseMetricSchema>;
export type LighthouseAudit = z.infer<typeof LighthouseAuditSchema>;
export type SslResult = z.infer<typeof SslResultSchema>;
export type CorsResult = z.infer<typeof CorsResultSchema>;
export type Vulnerability = z.infer<typeof VulnerabilitySchema>;

/* ------------------------------------------------------------------ */
/* 10. Chat & provider schemas                                         */
/* ------------------------------------------------------------------ */

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ProviderDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  models: z.array(z.string()),
  keyHint: z.string(),
  docsUrl: z.string().url(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ProviderDef = z.infer<typeof ProviderDefSchema>;
