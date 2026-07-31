import * as cheerio from "cheerio";
import type { FeatureFlags, SiteMeta, SiteSignals, Stage1Payload } from "@/lib/schema";
import { SiteSignalsSchema, Stage1PayloadSchema } from "@/lib/schema";
import { runLighthouse } from "./pagespeed";
import { scanSecurity } from "./security";

const TECH_PATTERNS: [string, RegExp][] = [
  ["Next.js", /_next\/static|__NEXT_DATA__/i],
  ["Nuxt", /__NUXT__|_nuxt\//i],
  ["React", /react(-dom)?[@./]/i],
  ["Vue.js", /vue[@./-]|v-cloak/i],
  ["Angular", /ng-version|angular[@./]/i],
  ["Svelte", /svelte[@./-]/i],
  ["WordPress", /wp-content|wp-includes/i],
  ["Shopify", /cdn\.shopify\.com|shopify/i],
  ["Webflow", /webflow\.io|webflow\./i],
  ["jQuery", /jquery[.-][\d]/i],
  ["Bootstrap", /bootstrap[@./-]/i],
  ["Tailwind CSS", /tailwind|tw-[a-z]/i],
  ["Google Analytics", /googletagmanager|gtag\(/i],
  ["Hotjar", /hotjar/i],
  ["Sentry", /sentry/i],
  ["Intercom", /intercom/i],
  ["Stripe", /js\.stripe\.com/i],
  ["Cloudflare", /cf-ray|cloudflare/i],
  ["Vercel", /vercel/i],
  ["Elementor", /elementor/i],
  ["Lodash", /lodash/i],
  ["Moment.js", /moment/i],
];

const CONNECTED_APP_PATTERNS: { name: string; category: string; rx: RegExp }[] = [
  { name: "WhatsApp", category: "social", rx: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|whatsapp\.com\/send|whatsapp\.com\/click/i },
  { name: "Facebook", category: "social", rx: /facebook\.com|fb\.com|fb:app_id|connect\.facebook\.net|fbq\(|facebook\.net\/.*fbevents/i },
  { name: "Instagram", category: "social", rx: /instagram\.com|instagr\.am/i },
  { name: "LinkedIn", category: "social", rx: /linkedin\.com|snap\.licdn\.com|platform\.linkedin\.com|licdn\.com/i },
  { name: "X (Twitter)", category: "social", rx: /twitter\.com|x\.com|platform\.twitter\.com|twq\(|t\.co\//i },
  { name: "YouTube", category: "social", rx: /youtube\.com|youtu\.be|googleapis\.com\/youtube/i },
  { name: "Telegram", category: "social", rx: /t\.me\/|telegram\.me|telegram\.org/i },
  { name: "TikTok", category: "social", rx: /tiktok\.com|tiktok\.com\/@/i },
  { name: "Pinterest", category: "social", rx: /pinterest\.com|assets\.pinterest\.com/i },
  { name: "Snapchat", category: "social", rx: /snapchat\.com|snap\.com/i },
  { name: "Intercom", category: "chat", rx: /intercom/i },
  { name: "Crisp", category: "chat", rx: /crisp\.chat|crisp\.im/i },
  { name: "Tawk.to", category: "chat", rx: /tawk\.to/i },
  { name: "Zendesk", category: "chat", rx: /zendesk/i },
  { name: "HubSpot", category: "chat", rx: /hubspot/i },
  { name: "Drift", category: "chat", rx: /drift\.com/i },
  { name: "Stripe", category: "payments", rx: /js\.stripe\.com|stripe\.com/i },
  { name: "PayPal", category: "payments", rx: /paypal\.com|paypalobjects\.com/i },
  { name: "Razorpay", category: "payments", rx: /razorpay\.com|razorpay/i },
  { name: "Google Analytics", category: "analytics", rx: /googletagmanager|gtag\(|google-analytics\.com/i },
  { name: "Google Tag Manager", category: "analytics", rx: /googletagmanager\.com/i },
  { name: "Hotjar", category: "analytics", rx: /hotjar/i },
  { name: "Meta Pixel", category: "ads", rx: /connect\.facebook\.net\/.*fbevents|fbq\(/i },
  { name: "TikTok Pixel", category: "ads", rx: /analytics\.tiktok\.com|tiktok pixel/i },
  { name: "LinkedIn Insight", category: "ads", rx: /snap\.licdn\.com\/.*insight|linkedin\.com\/insight/i },
];

export function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

const CATEGORY_RULES: [string, RegExp][] = [
  ["E-commerce", /shop|store|cart|checkout|product|buy|ecommerce/i],
  ["SaaS / Software", /dashboard|saas|platform|software|tool|api|workspace|crm|analytics/i],
  ["Media / Publishing", /news|blog|magazine|journal|press/i],
  ["Marketing / Agency", /agency|studio|marketing|brand|creative/i],
  ["Fintech", /bank|pay|invest|crypto|finance|wallet|trading/i],
  ["EdTech", /learn|course|academy|education/i],
  ["Health", /health|fitness|clinic|wellness|medical/i],
  ["Portfolio", /portfolio|freelance|photographer/i],
  ["Community", /community|forum|social|membership/i],
];

async function fetchHtml(rawUrl: string): Promise<{ url: string; status: number; headers: Record<string, string>; html: string; fetchMs: number }> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteLens/2.0)" } });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(/abort/i.test(msg) ? "Site timed out after 15s." : `Could not reach site: ${msg}`);
  } finally { clearTimeout(timer); }

  const fetchMs = Date.now() - started;
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  const text = await res.text();
  const ctype = res.headers.get("content-type") ?? "";
  if (!/text\/html/i.test(ctype) && !/<html[\s>]/i.test(text.slice(0, 500))) {
    throw new Error("Not an HTML page (got " + (ctype || "unknown") + ").");
  }

  return { url: res.url || url, status: res.status, headers, html: text, fetchMs };
}

function extractSignals(html: string, headers: Record<string, string>, finalUrl: string, fetchMs: number, status: number): SiteSignals {
  const $ = cheerio.load(html);
  const host = domainOf(finalUrl);

  // Meta
  const title = ($("title").first().text() || "").trim();
  const description = ($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "").trim();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Counts
  let imgMissingAlt = 0, imgTotal = 0;
  $("img").each((_, el) => { imgTotal++; if ($(el).attr("alt") === undefined) imgMissingAlt++; });
  let linksInternal = 0, linksExternal = 0, emptyHashLinks = 0, ctaCount = 0;
  const ctaRx = /(sign up|get started|buy|pricing|demo|download|subscribe|join|try)/i;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (href === "#" || href === "") emptyHashLinks++;
    if ($(el).text().trim() && ctaRx.test($(el).text())) ctaCount++;
    if (/^https?:/i.test(href)) { if (domainOf(href) === host) linksInternal++; else linksExternal++; }
  });
  $("button").each((_, el) => { if (ctaRx.test($(el).text().trim())) ctaCount++; });

  // Forms
  let inputsNoLabel = 0;
  $("input, select, textarea").each((_, el) => {
    const $el = $(el);
    const type = ($el.attr("type") || "").toLowerCase();
    if (["hidden", "submit", "button", "image"].includes(type)) return;
    const id = $el.attr("id");
    const hasLabel = !!(id && $(`label[for="${id}"]`).length) || $el.closest("label").length > 0;
    const hasAria = !!($el.attr("aria-label") || $el.attr("aria-labelledby") || $el.attr("placeholder"));
    if (!hasLabel && !hasAria) inputsNoLabel++;
  });

  // Heading order
  let lastLevel = 0, headingOrderOk = true;
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const lvl = parseInt(el.tagName.slice(1), 10);
    if (lastLevel && lvl > lastLevel + 1) headingOrderOk = false;
    lastLevel = lvl;
  });

  // Tech
  const tech = TECH_PATTERNS.filter(([, rx]) => rx.test(html)).map(([n]) => n);

  // Duplicate ids
  const idMap = new Map<string, number>();
  $("[id]").each((_, el) => { const id = $(el).attr("id") || ""; idMap.set(id, (idMap.get(id) ?? 0) + 1); });
  const duplicateIds = [...idMap.values()].filter((n) => n > 1).length;

  // Features
  const hrefs = $("a[href]").map((_, el) => ($(el).attr("href") || "").toLowerCase()).get();
  const allHrefs = hrefs.join(" ");
  const connectedApps = CONNECTED_APP_PATTERNS.filter((p) => p.rx.test(html) || p.rx.test(allHrefs)).map((p) => ({ name: p.name, category: p.category }));
  const features: FeatureFlags = {
    pricing: hrefs.some((h) => h.includes("pricing")) || /pricing/i.test(bodyText.slice(0, 3000)),
    signup: hrefs.some((h) => h.includes("signup") || h.includes("register")),
    login: hrefs.some((h) => h.includes("login") || h.includes("signin")),
    cart: hrefs.some((h) => h.includes("cart") || h.includes("checkout")),
    blog: hrefs.some((h) => h.includes("blog")),
    docs: hrefs.some((h) => h.includes("docs") || h.includes("help")),
    search: $('input[type="search"], input[name*="q"], input[name*="search"]').length > 0,
    analytics: tech.some((t) => ["Google Analytics", "Hotjar"].includes(t)),
    payments: tech.includes("Stripe"),
    liveChat: tech.includes("Intercom"),
  };

  // Brand color
  let brandColor: string | null = $('meta[name="theme-color"]').attr("content") || null;
  if (!brandColor) {
    const hexes = html.match(/#(?:[0-9a-f]{6})\b/gi) ?? [];
    const freq = new Map<string, number>();
    hexes.forEach((h) => freq.set(h.toLowerCase(), (freq.get(h.toLowerCase()) ?? 0) + 1));
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) brandColor = top[0];
  }

  const signals: SiteSignals = {
    url: finalUrl, finalUrl, status, https: finalUrl.startsWith("https:"),
    fetchMs, sizeKb: Math.round(Buffer.byteLength(html, "utf8") / 1024 * 10) / 10,
    meta: { title, description, ogImage: $('meta[property="og:image"]').attr("content") ?? null,
      themeColor: $('meta[name="theme-color"]').attr("content") ?? null,
      lang: $("html").attr("lang") ?? null, wordCount },
    h1Count: $("h1").length, h1Text: ($("h1").first().text() || "").trim().slice(0, 160),
    headingOrderOk, imgTotal, imgMissingAlt,
    linksInternal, linksExternal,
    scripts: $("script[src]").length, stylesheets: $('link[rel="stylesheet"]').length,
    forms: $("form").length, inputsNoLabel,
    ariaCount: $("[aria-label],[aria-labelledby],[role]").length,
    jsonLd: $('script[type="application/ld+json"]').length,
    hasViewport: $('meta[name="viewport"]').length > 0,
    hasCharset: $('meta[charset], meta[http-equiv="Content-Type"]').length > 0,
    hasFavicon: $('link[rel*="icon"]').length > 0,
    hasCanonical: $('link[rel="canonical"]').length > 0,
    hasRobotsNoindex: /noindex/i.test($('meta[name="robots"]').attr("content") ?? ""),
    hasDoctype: /^<!doctype html>/i.test(html.trimStart().slice(0, 40)),
    hasPrivacyLink: hrefs.some((h) => h.includes("privacy")),
    hasTermsLink: hrefs.some((h) => h.includes("terms") || h.includes("legal")),
    cookieMention: /cookie/i.test(bodyText),
    duplicateIds, loremHits: (bodyText.match(/lorem ipsum/gi) || []).length,
    todoComments: (html.match(/<!--[\s\S]*?\b(todo|fixme|xxx)\b[\s\S]*?-->/gi) || []).length,
    mixedContent: (html.match(/src=["']http:\/\//g) || []).length,
    inlineHandlers: $('[onclick],[onload],[onsubmit]').length,
    emptyHashLinks, wordCount, ctaCount, tech, features, brandColor, connectedApps, html, headers,
    landmarks: { header: $("header").length > 0, nav: $("nav").length > 0, main: $("main").length > 0, footer: $("footer").length > 0 },
  };

  return SiteSignalsSchema.parse(signals);
}

/**
 * STAGE 1: Gather all measurable data about a URL.
 * Fetches HTML → extracts heuristics → runs PageSpeed Lighthouse → runs security scan.
 */
export async function stage1Gather(rawUrl: string, opts: { skipLighthouse?: boolean } = {}): Promise<Stage1Payload> {
  const { url: finalUrl, status, headers, html, fetchMs } = await fetchHtml(rawUrl);
  const domain = domainOf(finalUrl);
  const signals = extractSignals(html, headers, finalUrl, fetchMs, status);

  // Run Lighthouse and security in parallel (Lighthouse optional for bulk scans)
  const [lighthouse, security] = await Promise.all([
    opts.skipLighthouse ? Promise.resolve(null) : runLighthouse(finalUrl).catch(() => null),
    scanSecurity(finalUrl, html, headers, signals.tech).catch(() => null),
  ]);

  // Infer category
  const haystack = `${signals.meta.title} ${signals.meta.description} ${signals.h1Text}`;
  const category = CATEGORY_RULES.find(([, rx]) => rx.test(haystack))?.[0] ?? "General Web";

  const payload: Stage1Payload = {
    url: signals.url, domain, finalUrl: signals.finalUrl,
    fetchedAt: new Date().toISOString(), fetchMs: signals.fetchMs, sizeKb: signals.sizeKb,
    status: signals.status, https: signals.https,
    tech: signals.tech, meta: signals.meta, features: signals.features,
    siteSignals: signals, lighthouse, security, category,
  };

  return Stage1PayloadSchema.parse(payload);
}

export { stage1Gather as scanSite };
