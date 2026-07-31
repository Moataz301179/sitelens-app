import { PageSpeedResultSchema, type PageSpeedResult } from "@/lib/schema";
import { env } from "./env";

const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];

/**
 * Runs Google Lighthouse via the free PageSpeed Insights API.
 * No auth key needed (optional key raises quota). Returns real Chrome scores.
 */
export async function runLighthouse(url: string): Promise<PageSpeedResult | null> {
  const { PAGESPEED_API_KEY } = env();
  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "seo");
  params.append("category", "best-practices");
  if (PAGESPEED_API_KEY) params.set("key", PAGESPEED_API_KEY);

  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const json = await res.json();

    const lh = json.lighthouseResult;
    if (!lh) return null;

    const categoryScore = (id: string): number => {
      const cat = lh.categories?.[id];
      return cat?.score != null ? Math.round(cat.score * 100) : 50;
    };

    const audits = lh.audits || {};
    const metrics = [
      { id: "first-contentful-paint", display: audits["first-contentful-paint"]?.displayValue ?? "" },
      { id: "largest-contentful-paint", display: audits["largest-contentful-paint"]?.displayValue ?? "" },
      { id: "cumulative-layout-shift", display: audits["cumulative-layout-shift"]?.displayValue ?? "" },
      { id: "total-blocking-time", display: audits["total-blocking-time"]?.displayValue ?? "" },
      { id: "speed-index", display: audits["speed-index"]?.displayValue ?? "" },
    ].map((m) => ({
      id: m.id,
      value: audits[m.id]?.numericValue ?? 0,
      displayValue: m.display,
      score: audits[m.id]?.score != null ? Math.round(audits[m.id].score * 100) : null,
    }));

    const auditList = Object.entries(audits).map(([id, a]: [string, any]) => ({
      id,
      title: a.title ?? id,
      score: a.score != null ? Math.round(a.score * 100) : null,
      scoreDisplayMode: a.scoreDisplayMode ?? "numeric",
      description: a.description ?? null,
    })).slice(0, 40);

    const screenshot = lh.audits?.["final-screenshot"]?.details;

    const result: PageSpeedResult = {
      performance: categoryScore("performance"),
      accessibility: categoryScore("accessibility"),
      seo: categoryScore("seo"),
      bestPractices: categoryScore("best-practices"),
      pwa: categoryScore("pwa"),
      categories: Object.entries(lh.categories || {}).map(([id, cat]: [string, any]) => ({
        id,
        score: cat.score != null ? Math.round(cat.score * 100) : 0,
        title: cat.title ?? id,
      })),
      metrics,
      audits: auditList,
      screenshot: screenshot?.data
        ? { data: screenshot.data, mimeType: screenshot.mimeType ?? "image/jpeg" }
        : null,
      finalUrl: lh.finalDisplayedUrl ?? json.finalUrl ?? url,
      strategy: "mobile",
      fetchedAt: new Date().toISOString(),
      loadingExperience: json.loadingExperience ?? null,
    };

    return PageSpeedResultSchema.parse(result);
  } catch {
    return null;
  }
}
