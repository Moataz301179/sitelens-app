import { listAnalyses } from "@/lib/db-helpers";
import { cleanExpiredRateLimits } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Clean expired rate limits periodically (best-effort, no-op on failure)
  cleanExpiredRateLimits().catch(() => {});
  return Response.json(await listAnalyses(12));
}
