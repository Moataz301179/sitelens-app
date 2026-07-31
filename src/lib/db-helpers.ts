import { desc, eq } from "drizzle-orm";
import { db, isDbConfigured } from "@/db";
import { analyses, chatSessions } from "@/db/schema";
import type { Report } from "@/lib/types";

const NO_DB = !isDbConfigured;
const fallbackId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`;

export async function createAnalysis(url: string, domain: string, provider?: string, model?: string): Promise<string> {
  if (NO_DB) return fallbackId();
  try {
    const [row] = await db
      .insert(analyses)
      .values({ url, domain, status: "pending", provider: provider ?? null, model: model ?? null })
      .returning({ id: analyses.id });
    return row.id;
  } catch {
    return fallbackId();
  }
}

export async function finishAnalysis(id: string, report: Report | null, status: "done" | "failed", error?: string): Promise<void> {
  if (NO_DB) return;
  try {
    await db
      .update(analyses)
      .set({ status, report, error: error ?? null, overallScore: report?.scores?.overall ?? null, updatedAt: new Date() })
      .where(eq(analyses.id, id));
  } catch {
    /* noop */
  }
}

export async function getAnalysis(id: string) {
  if (NO_DB) return null;
  try {
    const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function listAnalyses(limit = 10) {
  if (NO_DB) return [];
  try {
    return await db
      .select({ id: analyses.id, url: analyses.url, domain: analyses.domain, status: analyses.status, overallScore: analyses.overallScore, provider: analyses.provider, createdAt: analyses.createdAt })
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function getOrCreateChatSession(analysisId: string, provider: string, model: string) {
  if (NO_DB) return { id: fallbackId(), analysisId, provider, model, messages: [] as never[] };
  try {
    const rows = await db.select().from(chatSessions).where(eq(chatSessions.analysisId, analysisId)).limit(1);
    if (rows[0]) return rows[0];
    const [created] = await db.insert(chatSessions).values({ analysisId, provider, model, messages: [] }).returning();
    return created;
  } catch {
    return { id: fallbackId(), analysisId, provider, model, messages: [] as never[] };
  }
}

export async function saveChatMessages(sessionId: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<void> {
  if (NO_DB) return;
  try {
    await db.update(chatSessions).set({ messages: messages as never, updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));
  } catch {
    /* noop */
  }
}
