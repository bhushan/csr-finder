import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildQueries } from "@/lib/sources/queries";
import { bingNewsUrl, googleNewsRangeUrl, googleNewsUrl, parseBingNews, parseGoogleNews } from "@/lib/sources/feeds";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("buildQueries", () => {
  it("covers every sector with each signal intent, plus geography and policy queries", () => {
    const queries = buildQueries(DEFAULT_SETTINGS);
    for (const sector of DEFAULT_SETTINGS.sectors) {
      const intents = queries.filter((q) => q.sector === sector.name).map((q) => q.intent);
      expect(intents).toEqual(
        expect.arrayContaining(["new_initiative", "partner_search", "increased_allocation"]),
      );
    }
    expect(queries.some((q) => q.intent === "policy_change")).toBe(true);
    expect(queries.some((q) => q.intent === "geography" && q.text.includes("Pune"))).toBe(true);
  });

  it("only builds geography queries for tier 1 and 2 places", () => {
    const geoQueries = buildQueries(DEFAULT_SETTINGS).filter((q) => q.intent === "geography");
    expect(geoQueries.some((q) => q.text.includes("India"))).toBe(false);
  });

  it("returns unique ids and texts", () => {
    const queries = buildQueries(DEFAULT_SETTINGS);
    expect(new Set(queries.map((q) => q.id)).size).toBe(queries.length);
    expect(new Set(queries.map((q) => q.text)).size).toBe(queries.length);
  });

  it("follows configured sectors", () => {
    const queries = buildQueries({
      ...DEFAULT_SETTINGS,
      sectors: [{ name: "Health", keywords: ["health", "nutrition"] }],
    });
    expect(queries.filter((q) => q.sector).every((q) => q.sector === "Health")).toBe(true);
    expect(queries.find((q) => q.sector === "Health")!.text).toContain('"nutrition"');
  });
});

describe("feed urls", () => {
  it("builds an India-edition Google News search limited to the lookback window", () => {
    const url = new URL(googleNewsUrl("CSR skilling", 7));
    expect(url.hostname).toBe("news.google.com");
    expect(url.searchParams.get("q")).toBe("CSR skilling when:7d");
    expect(url.searchParams.get("gl")).toBe("IN");
  });

  it("builds a dated Google News search for backfilling past weeks", () => {
    const url = new URL(googleNewsRangeUrl("CSR skilling", new Date("2026-09-28T02:00:00Z"), new Date("2026-10-05T02:00:00Z")));
    expect(url.searchParams.get("q")).toBe("CSR skilling after:2026-09-27 before:2026-10-06");
  });

  it("builds a Bing News RSS url", () => {
    const url = new URL(bingNewsUrl("CSR skilling"));
    expect(url.searchParams.get("format")).toBe("rss");
    expect(url.searchParams.get("q")).toBe("CSR skilling");
  });
});

describe("parseGoogleNews", () => {
  const items = parseGoogleNews(fixture("google-news.xml"), "q1");

  it("parses items with clean titles, source and ISO dates", () => {
    expect(items.length).toBeGreaterThan(3);
    for (const item of items) {
      expect(item.provider).toBe("google_news");
      expect(item.queryId).toBe("q1");
      expect(item.url).toMatch(/^https:\/\/news\.google\.com\//);
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
      expect(item.source.length).toBeGreaterThan(0);
      expect(item.title.endsWith(` - ${item.source}`)).toBe(false);
    }
  });

  it("returns an empty list for garbage input instead of throwing", () => {
    expect(parseGoogleNews("<html>blocked</html>", "q1")).toEqual([]);
  });

  it("handles a single-item feed", () => {
    const xml = `<rss><channel><item><title>Infosys launches skilling drive - Mint</title><link>https://news.google.com/x</link><pubDate>Wed, 07 Oct 2026 12:04:54 GMT</pubDate><source url="https://mint.com">Mint</source></item></channel></rss>`;
    const [item] = parseGoogleNews(xml, "q1");
    expect(item.title).toBe("Infosys launches skilling drive");
    expect(item.source).toBe("Mint");
  });
});

describe("parseBingNews", () => {
  const items = parseBingNews(fixture("bing-news.xml"), "q2");

  it("unwraps the real publisher url and keeps the snippet", () => {
    expect(items.length).toBeGreaterThan(3);
    for (const item of items) {
      expect(item.provider).toBe("bing_news");
      expect(item.url).not.toContain("bing.com");
      expect(item.url).toMatch(/^https?:\/\//);
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
    }
    expect(items.some((i) => i.snippet.length > 20)).toBe(true);
  });
});
