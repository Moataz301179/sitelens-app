import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { env } from "./env";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(identifier: string, endpoint: string): Promise<RateLimitResult> {
  const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = env();
  const key = `${endpoint}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  try {
    const existing = await db
      .select()
      .from(rateLimits)
      .where(and(eq(rateLimits.key, key), gte(rateLimits.windowStart, windowStart)))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      if (row.requestCount >= RATE_LIMIT_MAX_REQUESTS) {
        const reset = new Date(row.windowStart.getTime() + RATE_LIMIT_WINDOW_MS).getTime();
        return { allowed: false, remaining: 0, reset };
      }
      await db
        .update(rateLimits)
        .set({ requestCount: row.requestCount + 1 })
        .where(eq(rateLimits.id, row.id));
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - row.requestCount - 1,
        reset: new Date(row.windowStart.getTime() + RATE_LIMIT_WINDOW_MS).getTime(),
      };
    }

    await db.insert(rateLimits).values({ key, windowStart: now, requestCount: 1 });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      reset: now.getTime() + RATE_LIMIT_WINDOW_MS,
    };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, reset: Date.now() + RATE_LIMIT_WINDOW_MS };
  }
}

export async function cleanExpiredRateLimits(): Promise<void> {
  const { RATE_LIMIT_WINDOW_MS } = env();
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS * 2);
  try {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, cutoff));
  } catch {
    /* noop */
  }
}
