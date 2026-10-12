import { describe, expect, it, vi } from "vitest";
import { runDigest } from "@/lib/pipeline/run";
import type { DigestAI } from "@/lib/ai/gemini";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const now = new Date("2026-10-12T02:00:00Z");

const bingFeed = (items: { title: string; url: string; date: string }[]) =>
  `<rss><channel>${items
    .map(
      (i) =>
        `<item><title>${i.title}</title><link>http://www.bing.com/news/apiclick.aspx?url=${encodeURIComponent(i.url)}&amp;c=1</link><description>${i.title} details</description><pubDate>${i.date}</pubDate><News:Source>Mint</News:Source></item>`,
    )
    .join("")}</channel></rss>`;

function fakeAI(): DigestAI {
  return {
    model: "gemini-test",
    triage: vi.fn(async (articles: Parameters<DigestAI["triage"]>[0]) =>
      articles.map((a) => ({
        id: a.id,
        relevant: !a.title.includes("cricket"),
        signalType: a.title.includes("partner") ? ("partner_search" as const) : ("new_initiative" as const),
        company: a.title.split(" ")[0],
        sectors: ["Skill development"],
        geography: a.title.includes("Pune") ? "Pune" : "India",
        storyKey: a.title.split(" ")[0].toLowerCase(),
      })),
    ),
    distill: vi.fn(async (cluster: Parameters<DigestAI["distill"]>[0]) => ({
      distilled: {
        headline: cluster.articles[0].title,
        whatHappened: "x",
        whyItMatters: "y",
        decision: "call_this_week" as const,
        warmth: 70,
        suggestedAngle: "z",
        contactHint: "",
        amount: "",
        verified: true,
      },
      grounding: [],
    })),
    summarize: vi.fn(async () => ({ headline: "Busy week", bullets: ["a"] })),
  };
}

describe("runDigest", () => {
  it("collects, filters, triages, clusters, distills, ranks and reports coverage", async () => {
    const fetchText = vi.fn(async (url: string) => {
      if (url.includes("news.google.com")) throw new Error("HTTP 503");
      return bingFeed([
        { title: "Wipro seeks NGO implementation partner in Pune", url: "https://mint.com/wipro", date: "Fri, 09 Oct 2026 03:27:00 GMT" },
        { title: "Infosys launches skilling programme", url: "https://mint.com/infosys", date: "Sat, 10 Oct 2026 03:27:00 GMT" },
        { title: "India wins cricket series", url: "https://mint.com/cricket", date: "Sat, 10 Oct 2026 03:27:00 GMT" },
        { title: "Old news from last month", url: "https://mint.com/old", date: "Mon, 01 Sep 2026 03:27:00 GMT" },
        { title: "Seen last week TCS skilling", url: "https://mint.com/seen", date: "Sun, 11 Oct 2026 03:27:00 GMT" },
      ]);
    });
    const ai = fakeAI();
    const progress = vi.fn();

    const digest = await runDigest({
      settings: DEFAULT_SETTINGS,
      now,
      fetchText,
      ai,
      filterUnseen: async (urls) => urls.filter((u) => !u.includes("seen")),
      onProgress: progress,
    });

    expect(digest.weekOf).toBe("2026-10-12");
    expect(digest.items.map((i) => i.company)).toEqual(["Wipro", "Infosys"]);
    expect(digest.items[0].signalType).toBe("partner_search");
    expect(digest.items[0].geoTier).toBe(1);
    expect(digest.items[0].sources[0].url).toBe("https://mint.com/wipro");
    expect(digest.summary.headline).toBe("Busy week");

    const c = digest.coverage;
    expect(c.feedFailures.length).toBe(c.queries); // every google request failed
    expect(c.feedRequests).toBe(c.queries * 2);
    expect(c.unique).toBe(4);
    expect(c.alreadySeen).toBe(1);
    expect(c.relevant).toBe(2);
    expect(c.distilled).toBe(2);
    expect(c.relevantBySignal).toEqual({ partner_search: 1, new_initiative: 1 });
    expect(progress).toHaveBeenCalled();
  });

  it("produces an empty but valid digest when nothing relevant was found", async () => {
    const ai = fakeAI();
    const digest = await runDigest({
      settings: DEFAULT_SETTINGS,
      now,
      fetchText: async () => "<rss><channel></channel></rss>",
      ai,
      filterUnseen: async (u) => u,
    });
    expect(digest.items).toEqual([]);
    expect(ai.triage).not.toHaveBeenCalled();
    expect(digest.summary.bullets.length).toBeGreaterThan(0);
  });
});
