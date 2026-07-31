import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Report, ChatMessage, SecurityResult, PageSpeedResult } from "@/lib/schema";

export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider"),
  model: text("model"),
  overallScore: integer("overall_score"),
  report: jsonb("report").$type<Report>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisId: uuid("analysis_id")
    .references(() => analyses.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  messages: jsonb("messages").$type<ChatMessage[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditJobs = pgTable("audit_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisId: uuid("analysis_id")
    .references(() => analyses.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"),
  stage: text("stage").default("queued"),
  progress: integer("progress").default(0),
  stage1Payload: jsonb("stage1_payload"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  provider: text("provider"),
  model: text("model"),
  error: text("error"),
  retryAfter: timestamp("retry_after", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditCache = pgTable("audit_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  normalizedUrl: text("normalized_url").notNull().unique(),
  stage1Payload: jsonb("stage1_payload").notNull(),
  report: jsonb("report").$type<Report>(),
  hitCount: integer("hit_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").default(1).notNull(),
});

export const auditScreenshots = pgTable("audit_screenshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisId: uuid("analysis_id")
    .references(() => analyses.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(),
  data: text("data").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
