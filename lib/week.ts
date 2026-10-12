const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Monday (YYYY-MM-DD, India time) of the week containing `date`. Digests are keyed by it. */
export function weekOf(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  ist.setUTCDate(ist.getUTCDate() - daysSinceMonday);
  return ist.toISOString().slice(0, 10);
}

export function formatWeek(weekOf: string) {
  return new Date(`${weekOf}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
