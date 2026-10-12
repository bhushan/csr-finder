import { describe, expect, it } from "vitest";
import { renderDigestEmail } from "@/lib/email/render";
import { adminToken, verifyAdminToken } from "@/lib/auth-token";
import type { Digest, DigestItem } from "@/lib/types";

const item = (over: Partial<DigestItem>): DigestItem => ({
  id: "1",
  headline: "Wipro seeks <NGO> partner",
  whatHappened: "Wipro Foundation opened an RFP.",
  whyItMatters: "Direct fit.",
  decision: "call_this_week",
  warmth: 88,
  suggestedAngle: "Lead with placements.",
  contactHint: "Wipro Foundation",
  amount: "Rs 10 crore",
  verified: true,
  company: "Wipro",
  signalType: "partner_search",
  sectors: ["Skill development"],
  geography: "Pune",
  geoTier: 1,
  score: 95,
  sources: [{ title: "Mint story", url: "https://mint.com/a", source: "Mint", publishedAt: "2026-10-09T00:00:00Z" }],
  groundingSources: [],
  ...over,
});

const digest: Digest = {
  id: "d1",
  weekOf: "2026-10-12",
  generatedAt: "2026-10-12T02:05:00Z",
  sectors: ["Education"],
  geographies: ["Pune"],
  summary: { headline: "Two warm leads", bullets: ["Wipro is looking for partners"] },
  items: [
    item({}),
    item({ id: "2", headline: "CSR rules amended", signalType: "policy_change", decision: "watch", company: "MCA" }),
    item({ id: "3", headline: "Minor mention", decision: "skip" }),
  ],
  coverage: {
    queries: 16, feedRequests: 32, feedFailures: [], fetched: 300, inWindow: 200, unique: 150,
    alreadySeen: 10, triaged: 140, relevant: 20, relevantBySignal: {}, clusters: 12, distilled: 12, model: "gemini",
    windowStart: "2026-10-05T02:00:00Z", windowEnd: "2026-10-12T02:00:00Z",
  },
};

describe("renderDigestEmail", () => {
  const email = renderDigestEmail(digest, "https://radar.example.com");

  it("has a dated subject with the call count", () => {
    expect(email.subject).toContain("1 call this week");
    expect(email.subject).toContain("12 Oct");
  });

  it("escapes html, links sources and the full digest, and leaves out skips", () => {
    expect(email.html).toContain("Wipro seeks &lt;NGO&gt; partner");
    expect(email.html).toContain('href="https://mint.com/a"');
    expect(email.html).toContain("https://radar.example.com/digests/d1");
    expect(email.html).toContain("CSR rules amended");
    expect(email.html).not.toContain("Minor mention");
    expect(email.text).toContain("Wipro seeks <NGO> partner");
  });
});

describe("admin token", () => {
  it("verifies only a token made from the same passcode", async () => {
    const token = await adminToken("secret-pass");
    expect(await verifyAdminToken(token, "secret-pass")).toBe(true);
    expect(await verifyAdminToken(token, "other")).toBe(false);
    expect(await verifyAdminToken(undefined, "secret-pass")).toBe(false);
    expect(await verifyAdminToken(token, undefined)).toBe(false);
  });
});
