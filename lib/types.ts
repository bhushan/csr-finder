export const SIGNAL_TYPES = [
  "partner_search",
  "new_initiative",
  "increased_allocation",
  "policy_change",
  "other",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const DECISIONS = ["call_this_week", "watch", "skip"] as const;
export type Decision = (typeof DECISIONS)[number];

export type Provider = "google_news" | "bing_news";

export type SearchQuery = {
  id: string;
  text: string;
  intent: SignalType | "geography";
  sector?: string;
};

/** One article as it came off a feed, before any AI work. */
export type RawArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  snippet: string;
  provider: Provider;
  queryId: string;
};

/** An article after dedupe, carrying every query/provider that surfaced it. */
export type Article = RawArticle & {
  id: string;
  queryIds: string[];
  providers: Provider[];
};

export type Triage = {
  id: string;
  relevant: boolean;
  signalType: SignalType;
  company: string;
  sectors: string[];
  geography: string;
  storyKey: string;
};

export type Cluster = {
  key: string;
  company: string;
  signalType: SignalType;
  sectors: string[];
  geography: string;
  articles: Article[];
};

export type Distilled = {
  headline: string;
  whatHappened: string;
  whyItMatters: string;
  decision: Decision;
  warmth: number;
  suggestedAngle: string;
  contactHint: string;
  amount: string;
  verified: boolean;
};

export type SourceLink = { title: string; url: string; source: string; publishedAt: string };

export type DigestItem = Distilled & {
  id: string;
  company: string;
  signalType: SignalType;
  sectors: string[];
  geography: string;
  geoTier: number | null;
  score: number;
  sources: SourceLink[];
  groundingSources: { title: string; url: string }[];
};

export type DigestSummary = {
  headline: string;
  bullets: string[];
};

export type Coverage = {
  queries: number;
  feedRequests: number;
  feedFailures: { query: string; provider: Provider; error: string }[];
  fetched: number;
  inWindow: number;
  unique: number;
  alreadySeen: number;
  triaged: number;
  relevant: number;
  relevantBySignal: Partial<Record<SignalType, number>>;
  clusters: number;
  distilled: number;
  model: string;
  windowStart: string;
  windowEnd: string;
};

export type Digest = {
  id: string;
  weekOf: string; // YYYY-MM-DD (Monday, IST)
  generatedAt: string;
  sectors: string[];
  geographies: string[];
  summary: DigestSummary;
  items: DigestItem[];
  coverage: Coverage;
};

export type ProgressFn = (step: string, progress: number, message: string) => Promise<void> | void;
