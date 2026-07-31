import { getAnalysis } from "@/lib/db-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await getAnalysis(id);
  if (!row) return Response.json({ error: "Analysis not found." }, { status: 404 });
  return Response.json(row);
}
