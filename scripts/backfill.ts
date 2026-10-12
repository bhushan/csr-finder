// Generate digests for past weeks from dated Google News searches, oldest first, then refresh this week.
// Usage: npm run backfill -- [weeks=4]
import { backfillWeek, executeRun, startRun } from "@/lib/digest-service";
import { weekOf } from "@/lib/week";

async function main() {
  const weeks = Number(process.argv[2] ?? 4);
  const thisMonday = new Date(`${weekOf(new Date())}T00:00:00+05:30`);
  for (let w = weeks; w >= 1; w--) {
    const monday = new Date(thisMonday.getTime() - w * 7 * 86_400_000);
    const digest = await backfillWeek(monday, () => {});
    const calls = digest.items.filter((i) => i.decision === "call_this_week").length;
    const warming = digest.items.filter((i) => i.history.length).length;
    console.log(`${digest.weekOf}: ${digest.coverage.unique} unique, ${digest.items.length} items, ${calls} calls, ${warming} warming`);
  }
  const { runId } = await startRun("manual");
  const digest = await executeRun(runId, { sendEmail: false });
  console.log(`current ${digest?.weekOf}: ${digest?.items.length} items, ${digest?.items.filter((i) => i.history.length).length} warming`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
