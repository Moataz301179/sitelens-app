/**
 * FULL SCAN — crawl a site (same-domain internal links, capped) and audit every
 * discovered page with the real analyzer (fetch + security scan; Lighthouse
 * skipped for speed during bulk crawl). Aggregates issues across pages and emits
 * a report + a JSON artifact that `batch-fix.ts` consumes to apply corrections
 * in batches.
 *
 *   npx tsx scripts/full-scan.ts [url] [maxPages]
 */
import { stage1Gather } from '../src/lib/analyzer';
import { auditFromStage1 } from './audit-to-context';
import * as cheerio from 'cheerio';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TARGET = process.argv[2] ?? 'https://www.hotelsvendors.com';
const MAX_PAGES = Math.max(1, Math.min(40, Number(process.argv[3] ?? 8)));

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

async function discoverLinks(startUrl: string, sameDomain: string): Promise<string[]> {
  const res = await fetch(startUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteLens/2.0)' },
    redirect: 'follow',
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!/^https?:\/\//i.test(href)) return;
    try {
      const u = new URL(href);
      if (u.hostname.replace(/^www\./, '') === sameDomain) urls.add(u.toString().split('#')[0]);
    } catch { /* ignore */ }
  });
  return [...urls];
}

interface PageResult { url: string; overall: number; scores: any; issues: any[]; }
interface MasterIssue extends Record<string, any> { category: string; title: string; pages: number; }

async function main() {
  const start = /^https?:\/\//i.test(TARGET) ? TARGET : 'https://' + TARGET;
  const domain = domainOf(start);
  console.log(`\n=== FULL SCAN of ${domain} (cap ${MAX_PAGES} pages) ===\n`);

  const links = await discoverLinks(start, domain);
  const pages = Array.from(new Set([start, ...links])).slice(0, MAX_PAGES);
  console.log(`Discovered ${pages.length} page(s) to scan.\n`);

  const results: PageResult[] = [];
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i];
    try {
      const payload = await stage1Gather(url, { skipLighthouse: true });
      const audit = auditFromStage1(payload);
      results.push({ url, overall: audit.scores.overall, scores: audit.scores, issues: audit.topIssues });
      console.log(`  [${i + 1}/${pages.length}] ${url} — overall ${audit.scores.overall}, ${audit.topIssues.length} issue(s)`);
    } catch (e) {
      console.log(`  [${i + 1}/${pages.length}] ${url} — FAILED: ${e instanceof Error ? e.message : e}`);
    }
    if (i < pages.length - 1) await new Promise((r) => setTimeout(r, 150)); // polite crawl
  }

  // Aggregate issues, dedupe by category+title, count affected pages.
  const byKey = new Map<string, MasterIssue>();
  for (const r of results) {
    for (const iss of r.issues) {
      const key = `${iss.category}|${iss.title}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.pages += 1;
        existing.estimatedRevenueImpact = Math.max(existing.estimatedRevenueImpact, iss.estimatedRevenueImpact);
      } else {
        byKey.set(key, { ...iss, url: r.url, pages: 1 });
      }
    }
  }
  const master = [...byKey.values()].sort((a, b) => b.pages - a.pages || b.estimatedRevenueImpact - a.estimatedRevenueImpact);

  const byCategory: Record<string, MasterIssue[]> = {};
  for (const m of master) (byCategory[m.category] ||= []).push(m);

  const avgOverall = results.length
    ? Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length)
    : 0;

  console.log(`\nScanned ${results.length} page(s). Unique issues: ${master.length}. Avg overall score: ${avgOverall}.`);

  const json = { domain, scannedAt: new Date().toISOString(), pagesScanned: results.length, avgOverall, issues: master, byCategory };
  const jsonPath = path.join(process.cwd(), 'generated', `full-scan-${domain}.json`);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');

  const md = [
    `# Full Scan Report — ${domain}`,
    ``,
    `Generated: ${json.scannedAt}`,
    `Pages scanned: ${results.length} | Unique issues: ${master.length} | Avg overall: ${avgOverall}`,
    ``,
    `## Issues by category`,
    ...Object.entries(byCategory).map(([cat, list]) => `- **${cat}**: ${list.length}`),
    ``,
    `## Master issue list (deduped, by reach)`,
    ...master.map((m) => `- [${m.severity}] ${m.title} — ${m.pages} page(s), ~$${m.estimatedRevenueImpact}/mo, ${m.fixEffort} effort, autoFixable=${m.autoFixable}`),
    ``,
  ].join('\n');
  const mdPath = path.join(process.cwd(), 'generated', `full-scan-${domain}-${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(`\nWrote: ${mdPath}`);
  console.log(`Wrote: ${jsonPath}`);
}

main().catch((e) => { console.error('FULL SCAN FAILED:', e); process.exit(1); });
