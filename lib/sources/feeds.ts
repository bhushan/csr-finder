import { XMLParser } from "fast-xml-parser";
import type { RawArticle } from "@/lib/types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

export function googleNewsUrl(query: string, days: number) {
  const params = new URLSearchParams({ q: `${query} when:${days}d`, hl: "en-IN", gl: "IN", ceid: "IN:en" });
  return `https://news.google.com/rss/search?${params}`;
}

const day = (d: Date, offset: number) => new Date(d.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

/** Dated search for backfilling a past week (Google's after/before are exclusive, so pad by a day). */
export function googleNewsRangeUrl(query: string, start: Date, end: Date) {
  const params = new URLSearchParams({ q: `${query} after:${day(start, -1)} before:${day(end, 1)}`, hl: "en-IN", gl: "IN", ceid: "IN:en" });
  return `https://news.google.com/rss/search?${params}`;
}

export function bingNewsUrl(query: string) {
  // qft interval 8 = past week; mkt pins the India edition.
  const params = new URLSearchParams({ q: query, format: "rss", qft: 'interval="8"', mkt: "en-IN" });
  return `https://www.bing.com/news/search?${params}`;
}

type XmlNode = string | { "#text"?: string; [key: string]: unknown } | undefined;

const text = (node: XmlNode): string => {
  if (node === undefined || node === null) return "";
  if (typeof node === "object") return String(node["#text"] ?? "");
  return String(node);
};

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

function items(xml: string): Record<string, XmlNode>[] {
  try {
    const doc = parser.parse(xml);
    const raw = doc?.rss?.channel?.item;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  } catch {
    return [];
  }
}

const isoDate = (s: string) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
};

export function parseGoogleNews(xml: string, queryId: string): RawArticle[] {
  return items(xml)
    .map((item) => {
      const source = text(item.source).trim();
      let title = stripHtml(text(item.title));
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
      const snippet = stripHtml(text(item.description));
      return {
        title,
        url: text(item.link).trim(),
        source: source || "Google News",
        publishedAt: isoDate(text(item.pubDate)),
        // Google's description is usually just the title again; only keep it when it adds something.
        snippet: snippet.startsWith(title) ? "" : snippet,
        provider: "google_news" as const,
        queryId,
      };
    })
    .filter((a) => a.title && a.url && a.publishedAt);
}

function unwrapBingLink(link: string) {
  try {
    const target = new URL(link).searchParams.get("url");
    return target && /^https?:\/\//.test(target) ? target : link;
  } catch {
    return link;
  }
}

export function parseBingNews(xml: string, queryId: string): RawArticle[] {
  return items(xml)
    .map((item) => ({
      title: stripHtml(text(item.title)),
      url: unwrapBingLink(text(item.link).trim()),
      source: text(item["News:Source"]).trim() || "Bing News",
      publishedAt: isoDate(text(item.pubDate)),
      snippet: stripHtml(text(item.description)),
      provider: "bing_news" as const,
      queryId,
    }))
    .filter((a) => a.title && a.url && a.publishedAt);
}
