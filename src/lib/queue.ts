import { eq, and, lte, isNull, or, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditCache, auditJobs } from "@/db/schema";
import type { Stage1Payload, Report } from "@/lib/schema";
import { env } from "./env";

/* ------------------------------------------------------------------ */
/* Cache layer: stores Stage1 payloads and final reports per domain    */
/* ------------------------------------------------------------------ */

export async function getCache(url: string): Promise<{ stage1: Stage1Payload; report: Report | null } | null> {
  const normalized = normalizeUrl(url);
  try {
    const rows = await db
      .select()
      .from(auditCache)
      .where(eq(auditCache.normalizedUrl, normalized))
      .limit(1);
    if (rows.length === 0 || rows[0].expiresAt < new Date()) return null;
    await db.update(auditCache).set({ hitCount: rows[0].hitCount + 1 }).where(eq(auditCache.id, rows[0].id));
    return { stage1: rows[0].stage1Payload as Stage1Payload, report: rows[0].report as Report | null };
  } catch {
    return null;
  }
}

export async function setCache(url: string, stage1: Stage1Payload, report: Report | null = null): Promise<void> {
  const normalized = normalizeUrl(url);
  const { CACHE_TTL_SECONDS } = env();
  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);
  try {
    await db
      .insert(auditCache)
      .values({ normalizedUrl: normalized, stage1Payload: stage1, report, hitCount: 0, expiresAt })
      .onConflictDoUpdate({
        target: auditCache.normalizedUrl,
        set: { stage1Payload: stage1, report, expiresAt, hitCount: sql`${auditCache.hitCount} + 1` },
      });
  } catch {
    /* noop — cache is best-effort */
  }
}

export async function invalidateCache(url: string): Promise<void> {
  const normalized = normalizeUrl(url);
  try {
    await db.delete(auditCache).where(eq(auditCache.normalizedUrl, normalized));
  } catch {
    /* noop */
  }
}

function normalizeUrl(raw: string): string {
  let u = raw.trim().toLowerCase();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const url = new URL(u);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return u;
  }
}

/* ------------------------------------------------------------------ */
/* Job queue: PostgreSQL-backed async jobs                             */
/* ------------------------------------------------------------------ */

export async function createJob(
  analysisId: string,
  url: string,
  domain: string,
  provider?: string,
  model?: string,
): Promise<string> {
  const [row] = await db
    .insert(auditJobs)
    .values({ analysisId, url, domain, provider: provider ?? null, model: model ?? null })
    .returning({ id: auditJobs.id });
  return row.id;
}

export async function getNextJob(): Promise<typeof auditJobs.$inferSelect | null> {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(auditJobs)
      .where(
        or(
          and(eq(auditJobs.status, "pending"), eq(auditJobs.stage, "queued")),
          and(
            eq(auditJobs.status, "processing"),
            lte(auditJobs.retryAfter, now),
            lt(auditJobs.attempts, auditJobs.maxAttempts),
          ),
        ),
      )
      .orderBy(auditJobs.createdAt)
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function updateJob(
  id: string,
  patch: Partial<{
    status: "pending" | "processing" | "completed" | "failed";
    stage: string;
    progress: number;
    stage1Payload: Stage1Payload;
    attempts: number;
    error: string;
    retryAfter: Date;
  }>,
): Promise<void> {
  await db
    .update(auditJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(auditJobs.id, id));
}

export async function getJob(id: string) {
  const rows = await db.select().from(auditJobs).where(eq(auditJobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getJobByAnalysisId(analysisId: string) {
  const rows = await db.select().from(auditJobs).where(eq(auditJobs.analysisId, analysisId)).limit(1);
  return rows[0] ?? null;
}
