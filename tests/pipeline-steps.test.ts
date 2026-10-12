import { describe, expect, it } from "vitest";
import { dedupeArticles, normalizeTitle, withinWindow } from "@/lib/pipeline/normalize";
import { clusterArticles, companyKey, mergeClusters, selectForAnalysis } from "@/lib/pipeline/cluster";
import { geoTier, scoreItem } from "@/lib/pipeline/score";
import { weekOf } from "@/lib/week";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Article, Cluster, RawArticle, Triage } from "@/lib/types";

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

describe("companyKey", () => {
  it("ignores legal suffixes, spacing and acronym-style spacing", () => {
    expect(companyKey("POWERGRID")).toBe(companyKey("Power Grid Corporation of India Limited"));
    expect(companyKey("Genpact")).toBe(companyKey("Genpact India Pvt Ltd"));
    expect(companyKey("Tata Motors")).not.toBe(companyKey("Tata Steel"));
  });
});

describe("mergeClusters", () => {
  const c = (key: string, company: string, over: Partial<Cluster> = {}): Cluster => ({
    key, company, signalType: "new_initiative", sectors: ["Education"], geography: "India",
    articles: [{ ...raw({ url: `https://e.com/${key}` }), id: key, queryIds: ["q"], providers: ["bing_news"] }],
    ...over,
  });

  it("merges clusters for the same company and signal when geographies do not conflict", () => {
    const merged = mergeClusters([
      c("a", "POWERGRID", { geography: "Chandigarh" }),
      c("b", "Power Grid Corporation of India", { geography: "Chandigarh, Punjab", sectors: ["Skill development"] }),
      c("c", "Power Grid Corporation of India Limited", { geography: "" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].articles).toHaveLength(3);
    expect(merged[0].sectors.sort()).toEqual(["Education", "Skill development"]);
  });

  it("keeps separate events by the same company in different places apart", () => {
    const merged = mergeClusters([c("a", "Infosys", { geography: "Pune" }), c("b", "Infosys", { geography: "Mysuru, Karnataka" })]);
    expect(merged).toHaveLength(2);
  });

  it("never merges clusters with no company", () => {
    expect(mergeClusters([c("a", ""), c("b", "")])).toHaveLength(2);
  });
});

describe("selectForAnalysis", () => {
  const c = (key: string, signalType: Cluster["signalType"]): Cluster => ({
    key, company: key, signalType, sectors: [], geography: "", articles: [],
  });
  it("keeps the given order but reserves slots for policy items", () => {
    const list = [c("a", "partner_search"), c("b", "new_initiative"), c("c", "new_initiative"), c("p1", "policy_change"), c("p2", "policy_change")];
    expect(selectForAnalysis(list, 3, 1).map((x) => x.key)).toEqual(["a", "b", "p1"]);
    expect(selectForAnalysis(list, 10, 1)).toHaveLength(5);
  });
});
