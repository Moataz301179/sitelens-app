import * as cheerio from "cheerio";
import type { SecurityResult, SslResult, CorsResult, Vulnerability } from "@/lib/schema";
import { SecurityResultSchema } from "@/lib/schema";

const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
];

const SENSITIVE_PATTERNS = [
  { rx: /<!--\s*(?:TODO|FIXME|HACK|TEMP|XXX|DEBUG|DRAFT)\b/i, label: "Dev comment" },
  { rx: /<!--\s*password|secret|key|token|credential\b/i, label: "Potential secret" },
  { rx: /\/\/\s*(?:private|internal|do[- ]not[- ]use|restricted)/i, label: "Restricted code marker" },
];

/**
 * Enhanced security audit: SSL check (via fetch), CORS analysis,
 * source-map exposure, sensitive comment leaks, CVE lookup via osv.dev.
 */
export async function scanSecurity(
  url: string,
  html: string,
  headers: Record<string, string>,
  detectedTech: string[],
): Promise<SecurityResult> {
  const isHttps = url.startsWith("https:");

  /* ── SSL/TLS validation ─────────────────────────────────────── */
  let ssl: SslResult | null = null;
  if (isHttps) {
    try {
      const host = new URL(url).hostname;
      const res = await fetch(`https://certificatedetails.com/api/v1/${host}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        ssl = {
          valid: true,
          daysUntilExpiry: data.daysUntilExpiry ?? null,
          issuer: data.issuer ?? null,
          protocol: data.protocol ?? "TLS",
        };
      }
    } catch {
      // If cert API unavailable, we still validate via basic TLS handshake
      try {
        await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
        ssl = { valid: true, daysUntilExpiry: null, issuer: null, protocol: "TLS (verified via HEAD)" };
      } catch {
        ssl = { valid: false, daysUntilExpiry: null, issuer: null, protocol: null };
      }
    }
  }

  /* ── Header analysis ────────────────────────────────────────── */
  const hdrs = SECURITY_HEADERS.map((name) => ({
    name,
    present: !!headers[name],
    value: headers[name]?.slice(0, 200) ?? null,
  }));

  /* ── CORS analysis ──────────────────────────────────────────── */
  const cors = analyzeCors(headers);

  /* ── Source-map detection ───────────────────────────────────── */
  const $ = cheerio.load(html);
  const sourceMaps: { url: string; size: number | null }[] = [];
  const scriptSrcs: string[] = [];
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src) scriptSrcs.push(src);
  });
  // Check for common source-map patterns
  const sourceMappingURLs = html.match(/\/\/#\s*sourceMappingURL\s*=\s*(\S+)/g) ?? [];
  for (const m of sourceMappingURLs.slice(0, 5)) {
    const srcUrl = m.replace(/\/\/#\s*sourceMappingURL\s*=\s*/, "").trim();
    sourceMaps.push({ url: srcUrl, size: null });
  }

  /* ── Sensitive comment detection ────────────────────────────── */
  const sensitiveComments: string[] = [];
  $("*").contents().each((_, node) => {
    if (node.type === "comment") {
      const text = $(node).text();
      for (const pat of SENSITIVE_PATTERNS) {
        if (pat.rx.test(text)) {
          sensitiveComments.push(`${pat.label}: "${text.slice(0, 100).trim()}"`);
        }
      }
    }
  });

  /* ── CVE / vulnerability check via osv.dev ─────────────────── */
  const vulnerabilities: Vulnerability[] = [];
  const packagesToCheck: string[] = [];

  // Map detected tech to known npm packages
  const techToPackage: Record<string, string> = {
    "jQuery": "jquery",
    "React": "react",
    "Vue.js": "vue",
    "Angular": "@angular/core",
    "Bootstrap": "bootstrap",
    "Next.js": "next",
    "Express": "express",
    "Lodash": "lodash",
    "Axios": "axios",
    "Moment.js": "moment",
    "WordPress": "wordpress",
  };

  for (const tech of detectedTech) {
    const pkg = techToPackage[tech];
    if (pkg) packagesToCheck.push(pkg);
  }

  // Query osv.dev for known vulnerabilities
  for (const pkg of packagesToCheck) {
    try {
      const res = await fetch("https://api.osv.dev/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: { name: pkg, ecosystem: "npm" } }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json() as { vulns?: { id: string; summary?: string; severity?: { type: string; score: string }[]; affected?: { package: { version?: string } }[] }[] };
        for (const vuln of (data.vulns ?? []).slice(0, 3)) {
          const severity = vuln.severity?.find((s) => s.type === "CVSS_V3")?.score ?? "unknown";
          const ver = vuln.affected?.[0]?.package?.version ?? null;
          vulnerabilities.push({
            id: vuln.id,
            title: vuln.summary ?? vuln.id,
            severity: severity === "CRITICAL" || severity === "HIGH" ? "critical" : severity === "MEDIUM" ? "warning" : "info",
            package: pkg,
            version: ver,
            cveIds: [vuln.id],
            fix: `Update ${pkg} to the latest patched version`,
          });
        }
      }
    } catch {
      // osv.dev unavailable — skip CVE check
    }
  }

  /* ── Mixed content count ────────────────────────────────────── */
  const mixedContent = (html.match(/src=["']http:\/\//g) || []).length;

  /* ── Score computation ─────────────────────────────────────── */
  let score = 100;
  const missingCritical = hdrs.filter((h) => !h.present && ["content-security-policy", "strict-transport-security"].includes(h.name));
  score -= missingCritical.length * 12;
  if (!ssl?.valid) score -= 30;
  if (cors?.issues.length) score -= cors.issues.length * 5;
  if (sourceMaps.length > 0) score -= Math.min(15, sourceMaps.length * 5);
  if (sensitiveComments.length > 0) score -= Math.min(20, sensitiveComments.length * 8);
  if (vulnerabilities.length > 0) score -= Math.min(30, vulnerabilities.length * 10);
  if (mixedContent > 0) score -= Math.min(25, mixedContent * 8);
  score = Math.max(0, Math.min(100, score));

  const result: SecurityResult = {
    ssl,
    headers: hdrs,
    cors,
    vulnerabilities,
    sourceMaps,
    sensitiveComments: sensitiveComments.slice(0, 10),
    mixedContent,
    score,
  };

  return SecurityResultSchema.parse(result);
}

function analyzeCors(headers: Record<string, string>): CorsResult {
  const acao = headers["access-control-allow-origin"];
  const acam = headers["access-control-allow-methods"];
  const acah = headers["access-control-allow-headers"];
  const acaexp = headers["access-control-expose-headers"];
  const acac = headers["access-control-allow-credentials"];

  const issues: string[] = [];
  if (acao === "*") issues.push("Wildcard origin — any site can make cross-origin requests");
  if (acao === "*" && acac === "true") issues.push("Wildcard origin with credentials — critical CORS misconfiguration");
  if (acam?.includes("DELETE") || acam?.includes("PUT")) {
    // Common but worth flagging
  }

  return {
    configured: !!acao,
    origin: acao ?? null,
    methods: acam ? acam.split(",").map((m) => m.trim()).filter(Boolean) : null,
    exposedHeaders: acaexp ? acaexp.split(",").map((m) => m.trim()).filter(Boolean) : null,
    allowsCredentials: acac === "true" ? true : acac === "false" ? false : null,
    issues,
  };
}
