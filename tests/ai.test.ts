import { describe, expect, it, vi } from "vitest";
import { createDigestAI, type Generate } from "@/lib/ai/gemini";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Article, Cluster } from "@/lib/types";

const article = (id: string): Article => ({
  id,
  title: `Headline ${id}`,
  url: `https://e.com/${id}`,
  source: "Mint",
  publishedAt: "2026-10-10T08:00:00.000Z",
  snippet: "snippet",
  provider: "bing_news",
  queryId: "q1",
  queryIds: ["q1"],
  providers: ["bing_news"],
});

const cluster: Cluster = {
  key: "infosys",
  company: "Infosys",
  signalType: "new_initiative",
  sectors: ["Skill development"],
  geography: "Pune",
  articles: [article("a")],
};

describe("triage", () => {
  it("batches articles and marks ids the model skipped as irrelevant", async () => {
    const generate = vi.fn<Generate>(async ({ prompt }) => {
      const ids = [...prompt.matchAll(/\[id:(\w+)\]/g)].map((m) => m[1]);
      return {
        text: JSON.stringify({
          items: ids.slice(0, -1).map((id) => ({
            id,
            relevant: true,
            signalType: "new_initiative",
            company: "Infosys",
            sectors: ["Education"],
            geography: "Pune",
            storyKey: "infosys",
          })),
        }),
        grounding: [],
      };
    });
    const ai = createDigestAI(generate, "gemini-test", { triageBatchSize: 3 });
    const result = await ai.triage(["a", "b", "c", "d", "e"].map(article), DEFAULT_SETTINGS);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(5);
    expect(result.find((t) => t.id === "c")!.relevant).toBe(false);
    expect(result.find((t) => t.id === "e")!.relevant).toBe(false);
    expect(result.find((t) => t.id === "a")!.relevant).toBe(true);
  });

  it("treats a failed batch as irrelevant rather than crashing the run", async () => {
    const generate = vi.fn<Generate>(async () => {
      throw new Error("boom");
    });
    const ai = createDigestAI(generate, "gemini-test", { retries: 0 });
    const result = await ai.triage([article("a")], DEFAULT_SETTINGS);
    expect(result).toEqual([expect.objectContaining({ id: "a", relevant: false })]);
  });
});

describe("distill", () => {
  const good = {
    headline: "Infosys opens skilling CSR call",
    whatHappened: "Infosys Foundation launched a programme.",
    whyItMatters: "Matches our Pune footprint.",
    decision: "call_this_week",
    warmth: 82,
    suggestedAngle: "Lead with our placement numbers.",
    contactHint: "Infosys Foundation CSR team",
    amount: "Rs 20 crore",
  };

  it("returns validated output plus grounding links, verified when grounded", async () => {
    const generate = vi.fn<Generate>(async () => ({
      text: "```json\n" + JSON.stringify(good) + "\n```",
      grounding: [{ title: "infosys.com", url: "https://infosys.com/x" }],
    }));
    const ai = createDigestAI(generate, "gemini-test");
    const { distilled, grounding } = await ai.distill(cluster, DEFAULT_SETTINGS);
    expect(distilled.decision).toBe("call_this_week");
    expect(distilled.verified).toBe(true);
    expect(grounding).toHaveLength(1);
  });

  it("clamps warmth and retries once without tools when the grounded call fails", async () => {
    const generate = vi
      .fn<Generate>()
      .mockRejectedValueOnce(new Error("tools unsupported"))
      .mockResolvedValueOnce({ text: JSON.stringify({ ...good, warmth: 140 }), grounding: [] });
    const ai = createDigestAI(generate, "gemini-test", { retries: 0 });
    const { distilled } = await ai.distill(cluster, DEFAULT_SETTINGS);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].grounded).toBe(false);
    expect(distilled.warmth).toBe(100);
    expect(distilled.verified).toBe(false);
  });

  it("falls back to an honest unverified watch item when the model is unavailable", async () => {
    const generate = vi.fn<Generate>(async () => {
      throw new Error("quota");
    });
    const ai = createDigestAI(generate, "gemini-test", { retries: 0 });
    const { distilled } = await ai.distill(cluster, DEFAULT_SETTINGS);
    expect(distilled.decision).toBe("watch");
    expect(distilled.verified).toBe(false);
    expect(distilled.headline).toBe("Headline a");
  });
});
