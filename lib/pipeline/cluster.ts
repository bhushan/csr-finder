import type { Article, Cluster, SignalType, Triage } from "@/lib/types";
import { normalizeTitle } from "./normalize";

/** Lower index = more actionable for an NGO looking for partners. */
export const SIGNAL_PRIORITY: SignalType[] = [
  "partner_search",
  "new_initiative",
  "increased_allocation",
  "policy_change",
  "other",
];

const keyOf = (t: Triage) => normalizeTitle(t.storyKey || t.company || t.id).replace(/\s+/g, "-");

export function clusterArticles(articles: Article[], triage: Triage[], excludedCompanies: string[]): Cluster[] {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const excluded = excludedCompanies.map(normalizeTitle).filter(Boolean);
  const clusters = new Map<string, Cluster>();

  for (const t of triage) {
    const article = byId.get(t.id);
    if (!article || !t.relevant) continue;
    const company = normalizeTitle(t.company);
    if (excluded.some((e) => company.includes(e))) continue;

    const key = keyOf(t);
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        key,
        company: t.company,
        signalType: t.signalType,
        sectors: [...t.sectors],
        geography: t.geography,
        articles: [article],
      });
      continue;
    }
    existing.articles.push(article);
    existing.sectors = [...new Set([...existing.sectors, ...t.sectors])];
    if (SIGNAL_PRIORITY.indexOf(t.signalType) < SIGNAL_PRIORITY.indexOf(existing.signalType)) {
      existing.signalType = t.signalType;
    }
    if (!existing.geography && t.geography) existing.geography = t.geography;
  }

  return [...clusters.values()];
}

const COMPANY_NOISE = new Set([
  "ltd", "limited", "pvt", "private", "corporation", "corp", "of", "india", "the", "inc", "co", "company", "plc", "llp", "and",
]);

/** Comparable company identity: "Power Grid Corporation of India Ltd" and "POWERGRID" both become "powergrid". */
export function companyKey(company: string) {
  return normalizeTitle(company)
    .split(" ")
    .filter((w) => w && !COMPANY_NOISE.has(w))
    .join("");
}

const NATIONAL = /\b(india|pan|national|nationwide|multiple|various)\b/;

function geographiesConflict(a: string, b: string) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb || NATIONAL.test(na) || NATIONAL.test(nb)) return false;
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  return !nb.split(" ").some((w) => ta.has(w));
}

/**
 * Gemini assigns story keys per triage batch, so one event can arrive as several clusters.
 * Merge same company + same signal unless they clearly happened in different places.
 */
export function mergeClusters(clusters: Cluster[]): Cluster[] {
  const out: Cluster[] = [];
  for (const c of clusters) {
    const key = companyKey(c.company);
    const target = key
      ? out.find((o) => companyKey(o.company) === key && o.signalType === c.signalType && !geographiesConflict(o.geography, c.geography))
      : undefined;
    if (!target) {
      out.push({ ...c, articles: [...c.articles], sectors: [...c.sectors] });
      continue;
    }
    target.articles.push(...c.articles);
    target.sectors = [...new Set([...target.sectors, ...c.sectors])];
    if (c.geography.length > target.geography.length && !NATIONAL.test(normalizeTitle(c.geography))) target.geography = c.geography;
  }
  return out;
}

/** Take the top `limit` clusters in order, but guarantee up to `policySlots` policy items make the cut. */
export function selectForAnalysis(clusters: Cluster[], limit: number, policySlots: number): Cluster[] {
  const policy = clusters.filter((c) => c.signalType === "policy_change").slice(0, policySlots);
  const chosen = new Set(policy);
  for (const c of clusters) {
    if (chosen.size >= limit) break;
    chosen.add(c);
  }
  return clusters.filter((c) => chosen.has(c));
}
