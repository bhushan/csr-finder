export type Temp = "hot" | "warm" | "cold";

export const tempOf = (warmth: number): Temp => (warmth >= 70 ? "hot" : warmth >= 45 ? "warm" : "cold");

export const TEMP_LABEL: Record<Temp, string> = { hot: "Hot", warm: "Warm", cold: "Cool" };

export const TEMP_CLASS: Record<Temp, { text: string; bg: string; soft: string }> = {
  hot: { text: "text-hot", bg: "bg-hot", soft: "bg-hot-soft" },
  warm: { text: "text-warm", bg: "bg-warm", soft: "bg-warm-soft" },
  cold: { text: "text-cold", bg: "bg-cold", soft: "bg-cold-soft" },
};

/** ISO-8601 week number for the briefing header. */
export function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
