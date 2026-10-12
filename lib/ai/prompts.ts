import type { Settings } from "@/lib/settings";
import type { Article, Cluster, DigestItem } from "@/lib/types";

export const SYSTEM = `You are the CSR intelligence analyst for an Indian education and skilling NGO.
You read Indian business and development-sector news and decide which developments deserve a partnership call this week.
You are precise and sceptical: never invent companies, amounts, people, dates or deadlines. If something is not stated in the sources, say it is not stated.`;

const orgBlock = (s: Settings) => `ORGANISATION: ${s.orgName}
PROFILE: ${s.orgProfile}
FOCUS SECTORS: ${s.sectors.map((x) => x.name).join(", ")}
GEOGRAPHIC PRIORITIES: ${s.geographies.map((g) => `${g.name} (tier ${g.tier})`).join(", ")} — tier 1 is home turf, tier 3 is national.`;

const line = (a: Article) =>
  `[id:${a.id}] ${a.title} | ${a.source} | ${a.publishedAt.slice(0, 10)}${a.snippet ? ` | ${a.snippet.slice(0, 280)}` : ""}`;

export function triagePrompt(articles: Article[], settings: Settings) {
  return `${orgBlock(settings)}

Classify each news item below. An item is RELEVANT only if it is one of:
- partner_search: a company, CSR foundation or government body explicitly seeking NGO / implementation partners, inviting proposals, RFPs or EOIs for CSR work in the focus sectors.
- new_initiative: a company or its foundation announcing or launching a new CSR programme, centre, scholarship, lab or partnership in the focus sectors.
- increased_allocation: a company signalling bigger CSR budgets or spend in the focus sectors (annual report coverage, crore commitments, CSR spend rankings).
- policy_change: a policy, rule, notification, court ruling or regulatory change affecting how companies in India deploy CSR funds (any sector).
Mark as NOT relevant: generic news, CSR outside the focus sectors (unless policy_change), events/award ceremonies with no programme, opinion pieces with no company action, non-Indian items with no India link.

For each item return:
- id (copy exactly), relevant (boolean), signalType (one of partner_search, new_initiative, increased_allocation, policy_change, other)
- company: the company/foundation/government body driving it ("" if none)
- sectors: which focus sectors it touches (use the names given above)
- geography: where the programme runs, as specific as stated (e.g. "Pune, Maharashtra", "Pan-India", "" if unknown)
- storyKey: a short lowercase key shared by items covering the SAME underlying event (e.g. "wipro-foundation-pune-skilling-rfp"). Different events by the same company get different keys.

ITEMS:
${articles.map(line).join("\n")}`;
}

export function distillPrompt(cluster: Cluster, settings: Settings, today: string) {
  return `${orgBlock(settings)}
TODAY: ${today}

A development surfaced in this week's CSR news scan:
COMPANY: ${cluster.company || "unknown"}
SIGNAL: ${cluster.signalType}
REPORTED AS:
${cluster.articles.map((a) => `- ${a.title} (${a.source}, ${a.publishedAt.slice(0, 10)}) ${a.url}${a.snippet ? `\n  ${a.snippet.slice(0, 400)}` : ""}`).join("\n")}

If tools are available, search the web to confirm what actually happened and find: the programme name, the CSR amount, where it runs, any implementation-partner call or deadline, and the CSR head / foundation contact named publicly.

Then decide for the organisation: is this worth a call THIS WEEK? Timing is everything: a company that has just announced an education or skilling CSR move is actively allocating budget and is warm, even if this particular project already has a partner (pitch the next phase, a new location or a complementary programme).
- call_this_week: (a) any explicit search for implementation partners / proposals in our sectors; or (b) a fresh education, skilling, digital literacy or youth employment CSR commitment by a company or foundation with operations or programmes in our tier 1 or tier 2 geographies, or a national programme that could expand there; or (c) a clear increase in CSR budget for our sectors.
- watch: relevant but weaker timing or fit: far-away geography with no stated India-wide footprint, one-off infrastructure handovers, scholarships run in-house, policy changes to track.
- skip: does not fit our sectors or work at all after reading the sources.
Warmth guide: 85-100 open partner call in our geographies; 65-84 fresh commitment in our sectors and geographies; 40-64 relevant but elsewhere or partner already locked; below 40 weak.
Only name a contact person if they are named in the sources or search results; otherwise name the team (e.g. "Infosys Foundation CSR team"). Refer to the organisation as "we/us", not by a person's name.

Respond with ONLY a JSON object, no prose, with these keys:
{
  "headline": "plain-English headline, max 14 words",
  "whatHappened": "2 sentences of facts with numbers and dates when stated",
  "whyItMatters": "1-2 sentences on why this matters for OUR organisation specifically",
  "decision": "call_this_week | watch | skip",
  "warmth": 0-100 (how warm this lead is for us right now),
  "suggestedAngle": "one sentence: the opening angle for the outreach call or email",
  "contactHint": "who to approach (named CSR head, foundation, team) or \\"\\" if not stated",
  "amount": "CSR amount if stated (e.g. \\"Rs 25 crore\\"), else \\"\\""
}`;
}

export function summaryPrompt(items: DigestItem[], settings: Settings, weekOf: string) {
  const list = items
    .map((i) => `- [${i.decision}] [${i.signalType}] ${i.company}: ${i.headline} (${i.geography || "location n/a"})`)
    .join("\n");
  return `${orgBlock(settings)}

These are the CSR developments found for the week of ${weekOf}, already ranked:
${list}

Write the opening of the Monday digest for the Head of Corporate Partnerships.
Return JSON: {"headline": "one sentence on what this week means for outreach", "bullets": ["3 to 5 bullets: who to call first and why, notable allocation or policy shifts, patterns worth noting"]}.
Only refer to companies and facts in the list. Be concrete and brief.`;
}
