import { describe, expect, it } from "vitest";
import { dedupeArticles, normalizeTitle, withinWindow } from "@/lib/pipeline/normalize";
import { clusterArticles } from "@/lib/pipeline/cluster";
import { geoTier, scoreItem } from "@/lib/pipeline/score";
import { weekOf } from "@/lib/week";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Article, RawArticle, Triage } from "@/lib/types";

const raw = (over: Partial<RawArticle>): RawArticle => ({
  title: "Infosys Foundation launches digital skilling programme in Pune",
  url: "https://example.com/a",
  source: "Mint",
  publishedAt: "2026-10-10T08:00:00.000Z",
  snippet: "",
  provider: "bing_news",
  queryId: "q1",
  ...over,
});

describe("normalizeTitle", () => {
  it("lowercases and strips punctuation and extra whitespace", () => {
    expect(normalizeTitle("  Tata STRIVE: ‘Skills’ for 10,000 youth!! ")).toBe(
      "tata strive skills for 10 000 youth",
    );
  });
});

describe("withinWindow", () => {
  const now = new Date("2026-10-12T02:00:00Z");
  it("keeps the last N days and drops older or future-dated items", () => {
    const kept = withinWindow(
      [
        raw({ publishedAt: "2026-10-11T00:00:00Z" }),
        raw({ publishedAt: "2026-10-01T00:00:00Z" }),
        raw({ publishedAt: "2026-10-20T00:00:00Z" }),
        raw({ publishedAt: "not a date" }),
      ],
      now,
      7,
    );
    expect(kept).toHaveLength(1);
  });
});

describe("dedupeArticles", () => {
  it("merges the same url and near-identical titles across providers", () => {
    const result = dedupeArticles([
      raw({ queryId: "q1" }),
      raw({ queryId: "q2", provider: "google_news", url: "https://news.google.com/x" }),
      raw({ url: "https://example.com/a", queryId: "q3" }),
      raw({ title: "HDFC Bank commits Rs 50 crore to school education", url: "https://e.com/b" }),
    ]);
    expect(result).toHaveLength(2);
    const merged = result.find((a) => a.url === "https://example.com/a")!;
    expect(merged.queryIds.sort()).toEqual(["q1", "q2", "q3"]);
    expect(merged.providers.sort()).toEqual(["bing_news", "google_news"]);
    expect(new Set(result.map((a) => a.id)).size).toBe(2);
  });

  it("prefers the copy with a real publisher url and longer snippet", () => {
    const [only] = dedupeArticles([
      raw({ provider: "google_news", url: "https://news.google.com/x", snippet: "" }),
      raw({ provider: "bing_news", url: "https://mint.com/a", snippet: "Longer snippet here" }),
    ]);
    expect(only.url).toBe("https://mint.com/a");
    expect(only.snippet).toBe("Longer snippet here");
  });
});

describe("clusterArticles", () => {
  const article = (id: string): Article => ({
    ...raw({ url: `https://e.com/${id}` }),
    id,
    queryIds: ["q1"],
    providers: ["bing_news"],
  });
  const triage = (id: string, over: Partial<Triage> = {}): Triage => ({
    id,
    relevant: true,
    signalType: "new_initiative",
    company: "Infosys",
    sectors: ["Skill development"],
    geography: "Pune",
    storyKey: "infosys-pune-skilling",
    ...over,
  });

  it("groups relevant articles by story key and drops irrelevant or excluded ones", () => {
    const clusters = clusterArticles(
      [article("a"), article("b"), article("c"), article("d")],
      [
        triage("a"),
        triage("b", { storyKey: "Infosys Pune Skilling " }),
        triage("c", { relevant: false }),
        triage("d", { company: "Bad Corp Ltd", storyKey: "badcorp" }),
      ],
      ["bad corp"],
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].articles.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("takes the most specific signal within a cluster", () => {
    const [cluster] = clusterArticles(
      [article("a"), article("b")],
      [triage("a"), triage("b", { signalType: "partner_search" })],
      [],
    );
    expect(cluster.signalType).toBe("partner_search");
  });
});

describe("scoring", () => {
  it("maps geography text to configured tiers, best tier wins", () => {
    expect(geoTier("Pune, Maharashtra", DEFAULT_SETTINGS.geographies)).toBe(1);
    expect(geoTier("Mumbai", DEFAULT_SETTINGS.geographies)).toBe(2);
    expect(geoTier("Pan-India", DEFAULT_SETTINGS.geographies)).toBe(3);
    expect(geoTier("Bengaluru", DEFAULT_SETTINGS.geographies)).toBeNull();
  });

  it("ranks a Pune partner search above a national allocation note", () => {
    const base = { warmth: 70, decision: "call_this_week" as const, sourceCount: 1 };
    const partner = scoreItem({ ...base, signalType: "partner_search", geoTier: 1 });
    const allocation = scoreItem({ ...base, signalType: "increased_allocation", geoTier: 3 });
    expect(partner).toBeGreaterThan(allocation);
    expect(partner).toBeLessThanOrEqual(100);
  });

  it("pushes skips to the bottom", () => {
    const skip = scoreItem({ warmth: 90, decision: "skip", signalType: "partner_search", geoTier: 1, sourceCount: 3 });
    const watch = scoreItem({ warmth: 40, decision: "watch", signalType: "other", geoTier: null, sourceCount: 1 });
    expect(skip).toBeLessThan(watch);
  });
});

describe("weekOf", () => {
  it("returns the IST Monday of the given instant", () => {
    // Monday 02:00 UTC = Monday 07:30 IST
    expect(weekOf(new Date("2026-10-12T02:00:00Z"))).toBe("2026-10-12");
    // Sunday 20:00 UTC = Monday 01:30 IST
    expect(weekOf(new Date("2026-10-11T20:00:00Z"))).toBe("2026-10-12");
    // Sunday 10:00 UTC = Sunday IST
    expect(weekOf(new Date("2026-10-11T10:00:00Z"))).toBe("2026-10-05");
  });
});
