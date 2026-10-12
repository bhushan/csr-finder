import { randomUUID } from "node:crypto";
import type { DigestAI } from "@/lib/ai/gemini";
import type { Settings } from "@/lib/settings";
import { bingNewsUrl, googleNewsRangeUrl, googleNewsUrl, parseBingNews, parseGoogleNews } from "@/lib/sources/feeds";
import { buildQueries } from "@/lib/sources/queries";
import type { Cluster, Coverage, Digest, DigestItem, HistoryEntry, ProgressFn, Provider, RawArticle } from "@/lib/types";
import { weekOf as weekOfDate } from "@/lib/week";
import { clusterArticles, companyKey, mergeClusters, selectForAnalysis, SIGNAL_PRIORITY } from "./cluster";
import { dedupeArticles, withinWindow } from "./normalize";
import { geoTier, scoreItem } from "./score";

export type RunDeps = {
  settings: Settings;
  now: Date;
  fetchText: (url: string) => Promise<string>;
  ai: DigestAI;
  /** Return only the urls that did not appear in an earlier week's digest. */
  filterUnseen: (urls: string[]) => Promise<string[]>;
  onProgress?: ProgressFn;
  /** Earlier digest appearances per company key, for the "warming up" signal. */
  companyHistory?: (keys: string[]) => Promise<Record<string, HistoryEntry[]>>;
  /** Backfill a past week: dated Google News searches only (Bing has no date filter). */
  historical?: boolean;
};

const MAX_TRIAGE = 240;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** Pre-AI ordering for the distill budget: actionable signal, more coverage, home geography. */
function clusterPriority(c: Cluster, settings: Settings) {
  const tier = geoTier(c.geography, settings.geographies);
  return (5 - SIGNAL_PRIORITY.indexOf(c.signalType)) * 10 + Math.min(c.articles.length, 4) * 3 + (tier ? 4 - tier : 0) * 4;
}

export async function runDigest(deps: RunDeps): Promise<Digest> {
  const { settings, now, fetchText, ai } = deps;
  const progress: ProgressFn = deps.onProgress ?? (() => {});
  const week = weekOfDate(now);

  // 1. Collect from live feeds
  const queries = buildQueries(settings);
  await progress("collect", 5, `Searching ${queries.length} queries across ${deps.historical ? "Google News (dated)" : "Google News and Bing News"}`);
  const windowStart = new Date(now.getTime() - settings.lookbackDays * 86_400_000);
  const requests = deps.historical
    ? queries.map((q) => ({ q, provider: "google_news" as Provider, url: googleNewsRangeUrl(q.text, windowStart, now) }))
    : queries.flatMap((q) => [
        { q, provider: "google_news" as Provider, url: googleNewsUrl(q.text, settings.lookbackDays) },
        { q, provider: "bing_news" as Provider, url: bingNewsUrl(q.text) },
      ]);
  const failures: Coverage["feedFailures"] = [];
  const fetched = await mapLimit(requests, 8, async ({ q, provider, url }) => {
    try {
      const xml = await fetchText(url);
      return provider === "google_news" ? parseGoogleNews(xml, q.id) : parseBingNews(xml, q.id);
    } catch (err) {
      failures.push({ query: q.text, provider, error: String((err as Error).message ?? err).slice(0, 200) });
      return [] as RawArticle[];
    }
  });
  const raw = fetched.flat();

  // 2. Window, dedupe, drop what earlier digests already covered
  await progress("filter", 20, `Fetched ${raw.length} articles; removing duplicates and old news`);
  const inWindow = withinWindow(raw, now, settings.lookbackDays);
  const unique = dedupeArticles(inWindow);
  const unseenUrls = new Set(await deps.filterUnseen(unique.map((a) => a.url)));
  const fresh = unique
    .filter((a) => unseenUrls.has(a.url))
    .sort((a, b) => b.queryIds.length - a.queryIds.length || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_TRIAGE);

  // 3. Triage with Gemini
  const triage = fresh.length ? (await progress("triage", 30, `Gemini is screening ${fresh.length} articles`), await ai.triage(fresh, settings)) : [];
  const relevantCount = triage.filter((t) => t.relevant).length;
  const relevantBySignal: Coverage["relevantBySignal"] = {};
  for (const t of triage) if (t.relevant) relevantBySignal[t.signalType] = (relevantBySignal[t.signalType] ?? 0) + 1;

  // 4. Cluster same-story coverage, keep the most promising for deep analysis
  const allClusters = mergeClusters(clusterArticles(fresh, triage, settings.excludedCompanies)).sort(
    (a, b) => clusterPriority(b, settings) - clusterPriority(a, settings),
  );
  const clusters = selectForAnalysis(allClusters, settings.maxItems, 3);

  // 5. Distill each development into a call / watch / skip decision
  let done = 0;
  if (clusters.length) await progress("distill", 45, `Analysing ${clusters.length} developments with web verification`);
  const items: DigestItem[] = await mapLimit(clusters, 4, async (cluster) => {
    const { distilled, grounding } = await ai.distill(cluster, settings, now);
    done++;
    await progress("distill", 45 + Math.round((done / clusters.length) * 40), `Analysed ${done} of ${clusters.length}: ${cluster.company || distilled.headline}`);
    const tier = geoTier(cluster.geography, settings.geographies);
    return {
      ...distilled,
      id: cluster.articles[0].id,
      company: cluster.company,
      signalType: cluster.signalType,
      sectors: cluster.sectors,
      geography: cluster.geography,
      geoTier: tier,
      score: scoreItem({ warmth: distilled.warmth, decision: distilled.decision, signalType: cluster.signalType, geoTier: tier, sourceCount: cluster.articles.length }),
      sources: cluster.articles.map((a) => ({ title: a.title, url: a.url, source: a.source, publishedAt: a.publishedAt })),
      groundingSources: grounding.slice(0, 5),
      companyKey: companyKey(cluster.company),
      history: [],
    };
  });
  if (deps.companyHistory && items.length) {
    const keys = [...new Set(items.map((i) => i.companyKey).filter(Boolean))];
    const history = keys.length ? await deps.companyHistory(keys) : {};
    for (const item of items) item.history = (history[item.companyKey] ?? []).filter((h) => h.weekOf < week);
  }
  items.sort((a, b) => b.score - a.score);

  // 6. Executive summary
  await progress("summary", 90, "Writing the Monday summary");
  const summary = items.length
    ? await ai.summarize(items, settings, week)
    : {
        headline: "No significant CSR developments in your sectors this week.",
        bullets: [
          `Scanned ${unique.length} unique articles from ${queries.length} searches; none matched your sectors and signals.`,
          "Consider widening sectors or geographies in Settings if this repeats.",
        ],
      };

  return {
    id: randomUUID(),
    weekOf: week,
    generatedAt: now.toISOString(),
    sectors: settings.sectors.map((s) => s.name),
    geographies: settings.geographies.map((g) => g.name),
    summary,
    items,
    coverage: {
      queries: queries.length,
      feedRequests: requests.length,
      feedFailures: failures,
      fetched: raw.length,
      inWindow: inWindow.length,
      unique: unique.length,
      alreadySeen: unique.length - unseenUrls.size,
      triaged: fresh.length,
      relevant: relevantCount,
      relevantBySignal,
      clusters: allClusters.length,
      distilled: items.length,
      model: ai.model,
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString(),
    },
    ...(deps.historical ? { backfilled: true } : {}),
  };
}
