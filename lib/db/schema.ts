import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Digest } from "@/lib/types";

// Everything persisted is plain JSON, never a class instance.

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const digests = pgTable(
  "digests",
  {
    id: text("id").primaryKey(),
    weekOf: text("week_of").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    data: jsonb("data").$type<Digest>().notNull(),
    emailedTo: jsonb("emailed_to").$type<string[]>().notNull().default([]),
  },
  (t) => [index("digests_week_idx").on(t.weekOf), index("digests_created_idx").on(t.createdAt)],
);

export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    trigger: text("trigger").notNull(), // cron | manual
    status: text("status").notNull(), // running | succeeded | failed
    step: text("step").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    message: text("message").notNull().default(""),
    log: jsonb("log").$type<{ at: string; step: string; message: string }[]>().notNull().default([]),
    error: text("error"),
    digestId: text("digest_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("runs_started_idx").on(t.startedAt)],
);

export const seenArticles = pgTable("seen_articles", {
  urlHash: text("url_hash").primaryKey(),
  weekOf: text("week_of").notNull(),
});
