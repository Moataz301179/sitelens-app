/**
 * BATCHED FIXES — consume a full-scan JSON and apply corrections in batches.
 *
 * Because the audited site (e.g. hotelsvendors.com) is not ours to edit,
 * "fix" here means generating a DRY-RUN remediation specification per batch
 * (reversible, local files only — no external changes). Batches are grouped by
 * category (default) or severity, processed sequentially, and each batch is
 * recorded as a measured execution so the team's trust/confirmation model tracks
 * the work.
 *
 *   npx tsx scripts/batch-fix.ts [domain] [category|severity]
 */
import { executiveState } from '../src/lib/executive-team/shared/executive-state';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ARGS = process.argv.slice(2);
const GENERATED = path.join(process.cwd(), 'generated');

function remediationFor(i: any): string {
  switch (i.category) {
    case 'security': return 'Patch per advisory; add missing headers (CSP, COOP, CORP); rotate exposed secrets; re-scan.';
    case 'seo': return 'Update <head>: title, meta description, canonical, structured data.';
    case 'accessibility': return 'Add alt text, label/aria to form fields, ensure landmarks & heading order.';
    case 'performance': return 'Compress assets, lazy-load, cache, reduce TTFB.';
    case 'ux': return 'Fix heading order, duplicate ids, add viewport, improve layout.';
    case 'compliance': return 'Add privacy/terms links, cookie consent, data-governance program.';
    default: return 'Remediate per best practice for this category.';
  }
}

function group(issues: any[], by: string): [string, any[]][] {
  const map = new Map<string, any[]>();
  for (const i of issues) {
    const k = by === 'severity' ? i.severity : i.category;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(i);
  }
  return [...map.entries()];
}

function load(domain: string) {
  const p = path.join(GENERATED, `full-scan-${domain}.json`);
  if (!fs.existsSync(p)) throw new Error(`No full-scan JSON at ${p}. Run full-scan first.`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function detectDomain(): string | undefined {
  if (!fs.existsSync(GENERATED)) return undefined;
  const f = fs.readdirSync(GENERATED).filter((x) => x.startsWith('full-scan-') && x.endsWith('.json')).sort().pop();
  return f?.replace('full-scan-', '').replace('.json', '');
}

async function main() {
  const by = ARGS[1] ?? 'category';
  const domain = ARGS[0] ?? detectDomain();
  if (!domain) throw new Error('Usage: npx tsx scripts/batch-fix.ts <domain> [category|severity]');

  const scan = load(domain);
  console.log(`\n=== BATCHED FIXES — ${domain} (group by ${by}) ===\n`);
  console.log(`Master issues: ${scan.issues.length}`);

  const groups = group(scan.issues, by);
  let batchN = 0;
  let totalCovered = 0;

  for (const [key, list] of groups) {
    batchN++;
    const file = path.join(GENERATED, `fix-${key}-batch-${batchN}.md`);
    const md = [
      `# Fix Batch #${batchN} — ${key}`,
      ``,
      `Generated: ${new Date().toISOString()}`,
      `Issues in this batch: ${list.length}`,
      `Mode: DRY-RUN (specification only — no external changes applied).`,
      ``,
      `## Items`,
      ...list.map((i: any, idx: number) =>
        `${idx + 1}. [${i.severity}] ${i.title}\n` +
        `   - Affected pages: ${i.pages}\n` +
        `   - Est. revenue impact: ~$${i.estimatedRevenueImpact}/mo\n` +
        `   - Effort: ${i.fixEffort} | Auto-fixable: ${i.autoFixable}\n` +
        `   - Remediation: ${remediationFor(i)}`),
      ``,
      `## Verification checklist`,
      `- [ ] Confirm issue reproduces on affected page(s)`,
      `- [ ] Apply fix in a staging branch`,
      `- [ ] Re-audit affected page(s) to confirm resolution`,
      `- [ ] Merge & monitor metric delta`,
      ``,
    ].join('\n');
    fs.writeFileSync(file, md, 'utf8');

    // Record a measured execution so the trust/confirmation model tracks this work.
    const eid = `fix-${key}-${batchN}-${Date.now()}`;
    executiveState.recordExecution({
      decisionId: eid,
      role: 'coo',
      decision: `Apply fix batch #${batchN} (${key}, ${list.length} item(s)) [DRY-RUN spec]`,
      status: 'running',
      queuedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      expectedImpact: { revenueIncrease: 0, costReduction: 0, customerAcquisition: 0, retentionImprovement: 0, confidence: 0.6 },
    });
    executiveState.completeExecution(eid, 'succeeded', undefined);

    totalCovered += list.length;
    console.log(`  Batch #${batchN} [${key}]: ${list.length} issue(s) -> ${path.basename(file)}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nWrote ${batchN} fix batch file(s), covering ${totalCovered} issue(s). All DRY-RUN / specification-only.`);
}

main().catch((e) => { console.error('BATCH FIX FAILED:', e); process.exit(1); });
