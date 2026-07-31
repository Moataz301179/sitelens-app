import { softwareEngineer, contextForSite, executiveState } from "@/lib/executive-team";
import type { ImplementationResult } from "@/lib/executive-team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/executive/apply  { url }  → run the Software Engineer agent on the
 *                                       live audit of `url` and open a fix PR.
 * GET  /api/executive/apply           → list recently applied fixes.
 *
 * Credential-gated: requires GITHUB_REPO + token/SSH and APPLY_ENABLED=true to
 * actually open a PR; otherwise it returns a dry-run spec (local path only).
 */
export async function POST(req: Request) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = body?.url;
  } catch { /* no body */ }

  if (!url) return Response.json({ error: "Provide a JSON body with a `url`." }, { status: 400 });

  try {
    const ctx = await contextForSite(url);
    const result = await softwareEngineer.applySite(ctx);
    return Response.json({
      ok: result.mode === "pr" || result.mode === "ssh",
      mode: result.mode,
      title: result.title,
      prUrl: result.prUrl ?? null,
      prNumber: result.prNumber ?? null,
      branch: result.branch ?? null,
      notes: result.notes,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  const applies = executiveState.recall<Array<ImplementationResult & { decisionId: string; at: string }>>("swe.applies") ?? [];
  return Response.json({ count: applies.length, last: applies.slice(-10) });
}
