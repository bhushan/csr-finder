import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { digests, leads, runs, seenArticles, settings as settingsTable } from "@/lib/db/schema";
import type { Lead, LeadStatus } from "@/lib/leads";
import { hashUrl } from "@/lib/pipeline/normalize";
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "@/lib/settings";
import type { Digest, HistoryEntry, SignalType } from "@/lib/types";

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

// --- Company history (warming-up signal) ---

export async function companyHistory(keys: string[]): Promise<Record<string, HistoryEntry[]>> {
  if (!keys.length) return {};
  const rows = await db().execute<{ week_of: string; k: string; h: string; s: SignalType }>(sql`
    select d.week_of, i->>'companyKey' as k, i->>'headline' as h, i->>'signalType' as s
    from ${digests} d, jsonb_array_elements(d.data->'items') i
    where i->>'companyKey' in (${sql.join(keys.map((k) => sql`${k}`), sql`, `)}) and i->>'decision' <> 'skip'
    order by d.week_of desc`);
  const out: Record<string, HistoryEntry[]> = {};
  for (const r of rows.rows) (out[r.k] ??= []).push({ weekOf: r.week_of, headline: r.h, signalType: r.s });
  return out;
}

// --- Outreach tracker ---

const toLead = (r: typeof leads.$inferSelect): Lead => ({
  itemId: r.itemId,
  digestId: r.digestId,
  company: r.company,
  status: r.status as LeadStatus,
  note: r.note,
  draft: r.draft ?? null,
  updatedAt: r.updatedAt.toISOString(),
});

export async function leadsFor(itemIds: string[]) {
  if (!itemIds.length) return {} as Record<string, Lead>;
  const rows = await db().select().from(leads).where(inArray(leads.itemId, itemIds));
  return Object.fromEntries(rows.map((r) => [r.itemId, toLead(r)])) as Record<string, Lead>;
}

export async function activeLeads() {
  const rows = await db().select().from(leads).where(ne(leads.status, "new")).orderBy(desc(leads.updatedAt));
  return rows.map(toLead);
}

export async function upsertLead(itemId: string, patch: { digestId: string; company: string; status?: LeadStatus; note?: string; draft?: Lead["draft"] }) {
  const set = { updatedAt: new Date(), ...(patch.company && { company: patch.company }), ...(patch.status && { status: patch.status }), ...(patch.note !== undefined && { note: patch.note }), ...(patch.draft !== undefined && { draft: patch.draft }) };
  const [row] = await db()
    .insert(leads)
    .values({ itemId, digestId: patch.digestId, company: patch.company, status: patch.status ?? "new", note: patch.note ?? "", draft: patch.draft ?? null })
    .onConflictDoUpdate({ target: leads.itemId, set })
    .returning();
  return toLead(row);
}
