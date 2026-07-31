import { codebaseLedger } from "@/lib/executive-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/executive/library — the accumulated Codebase Refinement Library.
 * Returns the "how & where" patterns and refinement history the Software
 * Engineer agent has built up, so it doesn't re-scan/re-derive each run.
 */
export async function GET() {
  const data = codebaseLedger.raw;
  const refinements = Object.values(data.refinements).sort((a, b) => b.at.localeCompare(a.at));
  const patterns = Object.values(data.patterns);
  return Response.json({
    counts: codebaseLedger.counts,
    updatedAt: data.updatedAt,
    markdown: codebaseLedger.toMarkdown(),
    patterns: patterns.map((p) => ({
      key: p.key,
      category: p.category,
      concern: p.concern,
      how: p.how,
      where: p.where,
    })),
    refinements: refinements.map((r) => ({
      domain: r.domain,
      category: r.category,
      title: r.title,
      status: r.status,
      prUrl: r.prUrl ?? null,
      at: r.at,
    })),
  });
}
