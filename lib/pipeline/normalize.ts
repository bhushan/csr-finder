import { createHash } from "node:crypto";
import type { Article, RawArticle } from "@/lib/types";

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const hashUrl = (url: string) => createHash("sha256").update(url).digest("hex").slice(0, 32);

export function withinWindow<T extends { publishedAt: string }>(articles: T[], now: Date, days: number): T[] {
  const end = now.getTime() + 60 * 60 * 1000; // tolerate small clock skew between feeds
  const start = now.getTime() - days * 24 * 60 * 60 * 1000;
  return articles.filter((a) => {
    const t = Date.parse(a.publishedAt);
    return !Number.isNaN(t) && t >= start && t <= end;
  });
}

const tokens = (title: string) => new Set(normalizeTitle(title).split(" ").filter((w) => w.length > 2));

function similar(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared) >= 0.75;
}

const isAggregatorUrl = (url: string) => url.includes("news.google.com");

/** Better copy wins: a real publisher link beats a Google redirect, then the longer snippet. */
function better(a: RawArticle, b: RawArticle) {
  if (isAggregatorUrl(a.url) !== isAggregatorUrl(b.url)) return isAggregatorUrl(a.url) ? b : a;
  return b.snippet.length > a.snippet.length ? b : a;
}

export function dedupeArticles(raw: RawArticle[]): Article[] {
  const groups: { best: RawArticle; urls: Set<string>; toks: Set<string>; queryIds: Set<string>; providers: Set<RawArticle["provider"]> }[] = [];

  for (const article of raw) {
    const toks = tokens(article.title);
    const group = groups.find((g) => g.urls.has(article.url) || similar(g.toks, toks));
    if (group) {
      group.best = better(group.best, article);
      group.urls.add(article.url);
      group.queryIds.add(article.queryId);
      group.providers.add(article.provider);
    } else {
      groups.push({
        best: article,
        urls: new Set([article.url]),
        toks,
        queryIds: new Set([article.queryId]),
        providers: new Set([article.provider]),
      });
    }
  }

  return groups.map((g) => ({
    ...g.best,
    id: hashUrl(g.best.url).slice(0, 10),
    queryIds: [...g.queryIds],
    providers: [...g.providers],
  }));
}
