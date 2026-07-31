import type { AgentId } from "./types";

export interface AgentMeta {
  id: AgentId;
  name: string;
  tagline: string;
}

export const AGENTS: AgentMeta[] = [
  { id: "recon", name: "Site Recon", tagline: "Fetches the page, measures response, weight, stack fingerprints" },
  { id: "market", name: "Market Analyst", tagline: "Category, demand signals, positioning, channel fit" },
  { id: "idea", name: "Idea Validator", tagline: "Verdict on the core proposition with strengths and risks" },
  { id: "business", name: "Business Logic Auditor", tagline: "Monetization, activation, retention mechanics" },
  { id: "gaps", name: "Market Gap Finder", tagline: "Exploitable gaps versus category norms" },
  { id: "ux", name: "UX/UI Critic", tagline: "Navigation, CTAs, content depth, form friction" },
  { id: "compliance", name: "Compliance Officer", tagline: "Privacy, terms, consent, WCAG violations" },
  { id: "security", name: "Security Auditor", tagline: "TLS, security headers, mixed content, exposure" },
  { id: "qa", name: "QA Bug Hunter", tagline: "Dead links, duplicate ids, placeholder copy, TODOs" },
  { id: "prompts", name: "Prompt Engineer", tagline: "Compiles corrective prompts for your AI builder" },
];
