import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { digests, runs, seenArticles, settings as settingsTable } from "@/lib/db/schema";
import { hashUrl } from "@/lib/pipeline/normalize";
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "@/lib/settings";
import type { Digest } from "@/lib/types";

export async function getSettings(): Promise<Settings> {
  const [row] = await db().select().from(settingsTable).where(eq(settingsTable.id, 1));
  return row ? parseSettings(row.data) : DEFAULT_SETTINGS;
}

export async function saveSettings(value: Settings) {
  await db()
    .insert(settingsTable)
    .values({ id: 1, data: value })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: value, updatedAt: new Date() } });
}

/** One digest per week: a re-run in the same week replaces the earlier one. */
export async function saveDigest(digest: Digest) {
  await db().insert(digests).values({ id: digest.id, weekOf: digest.weekOf, data: digest });
  await db().delete(digests).where(and(eq(digests.weekOf, digest.weekOf), ne(digests.id, digest.id)));
}

export async function markEmailed(id: string, to: string[]) {
  await db().update(digests).set({ emailedTo: to }).where(eq(digests.id, id));
}

export async function latestDigest() {
  const [row] = await db().select().from(digests).orderBy(desc(digests.createdAt)).limit(1);
  return row ?? null;
}

export async function getDigest(id: string) {
  const [row] = await db().select().from(digests).where(eq(digests.id, id));
  return row ?? null;
}

export async function listDigests(limit = 52) {
  return db()
    .select({
      id: digests.id,
      weekOf: digests.weekOf,
      createdAt: digests.createdAt,
      headline: sql<string>`${digests.data}->'summary'->>'headline'`,
      items: sql<number>`jsonb_array_length(${digests.data}->'items')`,
      calls: sql<number>`(select count(*) from jsonb_array_elements(${digests.data}->'items') i where i->>'decision' = 'call_this_week')`,
    })
    .from(digests)
    .orderBy(desc(digests.weekOf))
    .limit(limit);
}

export async function filterUnseen(urls: string[], weekOf: string) {
  if (!urls.length) return [];
  const hashes = urls.map(hashUrl);
  const seen = await db()
    .select({ urlHash: seenArticles.urlHash })
    .from(seenArticles)
    .where(and(inArray(seenArticles.urlHash, hashes), lt(seenArticles.weekOf, weekOf)));
  const seenSet = new Set(seen.map((s) => s.urlHash));
  return urls.filter((_, i) => !seenSet.has(hashes[i]));
}

export async function markSeen(urls: string[], weekOf: string) {
  if (!urls.length) return;
  await db()
    .insert(seenArticles)
    .values([...new Set(urls)].map((u) => ({ urlHash: hashUrl(u), weekOf })))
    .onConflictDoNothing();
}

export type RunRow = typeof runs.$inferSelect;

export async function createRun(id: string, trigger: "cron" | "manual") {
  await db().insert(runs).values({ id, trigger, status: "running", step: "queued", message: "Starting" });
}

export async function updateRun(id: string, patch: Partial<Omit<RunRow, "id">>, logLine?: { step: string; message: string }) {
  const set: Record<string, unknown> = { ...patch };
  if (logLine) {
    set.log = sql`${runs.log} || ${JSON.stringify([{ at: new Date().toISOString(), ...logLine }])}::jsonb`;
  }
  await db().update(runs).set(set).where(eq(runs.id, id));
}

export async function getRun(id: string) {
  const [row] = await db().select().from(runs).where(eq(runs.id, id));
  return row ?? null;
}

/** A run still marked running and started within the function time limit. */
export async function activeRun() {
  const [row] = await db()
    .select()
    .from(runs)
    .where(and(eq(runs.status, "running"), sql`${runs.startedAt} > now() - interval '6 minutes'`))
    .orderBy(desc(runs.startedAt))
    .limit(1);
  return row ?? null;
}

export async function recentRuns(limit = 5) {
  return db().select().from(runs).orderBy(desc(runs.startedAt)).limit(limit);
}
