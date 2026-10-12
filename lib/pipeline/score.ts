import type { Settings } from "@/lib/settings";
import type { Decision, SignalType } from "@/lib/types";

const SIGNAL_BONUS: Record<SignalType, number> = {
  partner_search: 25,
  new_initiative: 15,
  increased_allocation: 10,
  policy_change: 5,
  other: 0,
};

const GEO_BONUS: Record<number, number> = { 1: 15, 2: 8, 3: 3 };

const DECISION_OFFSET: Record<Decision, number> = { call_this_week: 0, watch: -10, skip: -60 };

/** Best (lowest) configured tier mentioned in the free-text geography Gemini extracted. */
export function geoTier(geography: string, geographies: Settings["geographies"]): number | null {
  const text = geography.toLowerCase();
  const nationalHints = ["india", "pan-india", "national", "nationwide"];
  let best: number | null = null;
  for (const g of geographies) {
    const name = g.name.toLowerCase();
    const hit = text.includes(name) || (name === "india" && nationalHints.some((h) => text.includes(h)));
    if (hit && (best === null || g.tier < best)) best = g.tier;
  }
  return best;
}

/** Deterministic rank on top of Gemini's warmth, so ordering is explainable and stable. */
export function scoreItem(input: {
  warmth: number;
  decision: Decision;
  signalType: SignalType;
  geoTier: number | null;
  sourceCount: number;
}) {
  const raw =
    0.6 * input.warmth +
    SIGNAL_BONUS[input.signalType] +
    (input.geoTier ? GEO_BONUS[input.geoTier] : 0) +
    Math.min(input.sourceCount - 1, 2) * 3 +
    DECISION_OFFSET[input.decision];
  // Skips always sink below anything we might act on.
  const ceiling = input.decision === "skip" ? 10 : 100;
  return Math.max(0, Math.min(ceiling, Math.round(raw)));
}
