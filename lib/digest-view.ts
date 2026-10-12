import type { DigestItem, SignalType } from "@/lib/types";

export const SIGNAL_LABEL: Record<SignalType, string> = {
  partner_search: "Seeking partners",
  new_initiative: "New initiative",
  increased_allocation: "Bigger allocation",
  policy_change: "Policy change",
  other: "Other",
};

/** One grouping used by both the web view and the email, so they never disagree. */
export function groupItems(items: DigestItem[]) {
  const policy = items.filter((i) => i.signalType === "policy_change" && i.decision !== "skip");
  const rest = items.filter((i) => i.signalType !== "policy_change");
  return {
    calls: rest.filter((i) => i.decision === "call_this_week"),
    watch: rest.filter((i) => i.decision === "watch"),
    policy,
    skipped: items.filter((i) => i.decision === "skip"),
  };
}
