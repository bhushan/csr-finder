import type { Settings } from "@/lib/settings";
import type { SearchQuery } from "@/lib/types";

const orGroup = (terms: string[]) =>
  terms.length === 1 ? `"${terms[0]}"` : `(${terms.map((t) => `"${t}"`).join(" OR ")})`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Turn configured sectors and geographies into news searches, one per signal Ananya cares about.
 * Kept small on purpose: each query runs against two feeds, every week.
 */
export function buildQueries(settings: Settings): SearchQuery[] {
  const queries: SearchQuery[] = [];

  for (const sector of settings.sectors) {
    const kw = orGroup(sector.keywords);
    const id = slug(sector.name);
    queries.push(
      { id: `${id}-new`, intent: "new_initiative", sector: sector.name, text: `CSR ${kw} (launches OR initiative OR programme OR foundation)` },
      { id: `${id}-partner`, intent: "partner_search", sector: sector.name, text: `CSR ${kw} ("implementation partner" OR "NGO partner" OR "invites proposals" OR "expression of interest")` },
      { id: `${id}-spend`, intent: "increased_allocation", sector: sector.name, text: `CSR ${kw} (crore OR "annual report" OR spend OR allocation)` },
    );
  }

  const focus = orGroup(settings.sectors.slice(0, 4).map((s) => s.keywords[0]));
  for (const geo of settings.geographies.filter((g) => g.tier <= 2)) {
    queries.push({ id: `geo-${slug(geo.name)}`, intent: "geography", text: `CSR "${geo.name}" ${focus}` });
  }

  queries.push(
    { id: "policy-rules", intent: "policy_change", text: `CSR (rules OR amendment OR "Schedule VII" OR "Companies Act") India` },
    { id: "policy-mca", intent: "policy_change", text: `"corporate social responsibility" (MCA OR ministry OR SEBI OR notification)` },
  );

  const seen = new Set<string>();
  return queries.filter((q) => !seen.has(q.text) && seen.add(q.text));
}
