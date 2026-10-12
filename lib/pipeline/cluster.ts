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
