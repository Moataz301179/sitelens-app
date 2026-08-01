import { desc, eq } from "drizzle-orm";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db, isDbConfigured } from "@/db";
import { analyses, chatSessions } from "@/db/schema";
import type { Report } from "@/lib/types";

const NO_DB = !isDbConfigured;
const fallbackId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`;

/* ------------------------------------------------------------------ */
/* File-based fallback store (used when no PostgreSQL is configured).  */
/* Analyses + chat sessions persist as JSON under generated/ so the    */
/* whole app (report pages, recent audits, copilot chat) is fully       */
/* functional without a database.                                      */
/* ------------------------------------------------------------------ */

const ANALYSES_DIR = path.join(process.cwd(), "generated", "analyses");
const CHATS_DIR = path.join(process.cwd(), "generated", "chats");

interface StoredAnalysis {
  id: string;
  url: string;
  domain: string;
  status: string;
  provider: string | null;
  model: string | null;
  overallScore: number | null;
  report: Report | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredChatSession {
  id: string;
  analysisId: string;
  provider: string;
  model: string;
  messages: { role: "user" | "assistant"; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const analysisFile = (id: string) => path.join(ANALYSES_DIR, `${id}.json`);
const chatFile = (sessionId: string) => path.join(CHATS_DIR, `${sessionId}.json`);

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    /* noop */
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  try {
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
  } catch {
    /* noop */
  }
}

/* ------------------------------- analyses ------------------------- */

export async function createAnalysis(url: string, domain: string, provider?: string, model?: string): Promise<string> {
  if (NO_DB) {
    const id = fallbackId();
    const now = new Date().toISOString();
    await ensureDir(ANALYSES_DIR);
    await writeJson(analysisFile(id), {
      id, url, domain, status: "pending", provider: provider ?? null, model: model ?? null,
      overallScore: null, report: null, error: null, createdAt: now, updatedAt: now,
    } satisfies StoredAnalysis);
    return id;
  }
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
  if (NO_DB) {
    const existing = await readJson<StoredAnalysis>(analysisFile(id));
    await ensureDir(ANALYSES_DIR);
    await writeJson(analysisFile(id), {
      ...(existing ?? { id, url: "", domain: "", provider: null, model: null, overallScore: null, createdAt: new Date().toISOString() }),
      status,
      report,
      error: error ?? null,
      overallScore: report?.scores?.overall ?? null,
      updatedAt: new Date().toISOString(),
    } satisfies StoredAnalysis);
    return;
  }
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
  if (NO_DB) return readJson<StoredAnalysis>(analysisFile(id));
  try {
    const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function listAnalyses(limit = 10) {
  if (NO_DB) {
    await ensureDir(ANALYSES_DIR);
    let names: string[];
    try {
      names = await fs.readdir(ANALYSES_DIR);
    } catch {
      return [];
    }
    const rows: StoredAnalysis[] = [];
    for (const n of names.filter((x) => x.endsWith(".json"))) {
      const r = await readJson<StoredAnalysis>(path.join(ANALYSES_DIR, n));
      if (r) rows.push(r);
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    // createdAt is stored as an ISO string on disk; the DB path returns a real
    // Date, so normalize to Date here to keep callers (e.g. .toISOString())
    // working identically with or without a database.
    return rows.slice(0, limit).map((r) => ({
      id: r.id, url: r.url, domain: r.domain, status: r.status,
      overallScore: r.overallScore, provider: r.provider, createdAt: new Date(r.createdAt),
    }));
  }
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

/* --------------------------- chat sessions ------------------------ */

export async function getOrCreateChatSession(analysisId: string, provider: string, model: string) {
  if (NO_DB) {
    await ensureDir(CHATS_DIR);
    let names: string[] = [];
    try {
      names = await fs.readdir(CHATS_DIR);
    } catch {
      names = [];
    }
    for (const n of names.filter((x) => x.endsWith(".json"))) {
      const s = await readJson<StoredChatSession>(path.join(CHATS_DIR, n));
      if (s && s.analysisId === analysisId) return { id: s.id, analysisId, provider: s.provider, model: s.model, messages: s.messages };
    }
    const id = fallbackId();
    const now = new Date().toISOString();
    const session: StoredChatSession = { id, analysisId, provider, model, messages: [], createdAt: now, updatedAt: now };
    await writeJson(chatFile(id), session);
    return { id, analysisId, provider, model, messages: [] };
  }
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
  if (NO_DB) {
    const existing = await readJson<StoredChatSession>(chatFile(sessionId));
    if (!existing) return;
    await ensureDir(CHATS_DIR);
    await writeJson(chatFile(sessionId), { ...existing, messages, updatedAt: new Date().toISOString() });
    return;
  }
  try {
    await db.update(chatSessions).set({ messages: messages as never, updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));
  } catch {
    /* noop */
  }
}
