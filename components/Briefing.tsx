import { LeadBoard } from "@/components/LeadBoard";
import { groupItems, SIGNAL_LABEL } from "@/lib/digest-view";
import type { Lead } from "@/lib/leads";
import type { Digest, SignalType } from "@/lib/types";
import { isoWeek, TEMP_CLASS, tempOf } from "@/lib/warmth";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

function CallSheet({ digest }: { digest: Digest }) {
  const { calls } = groupItems(digest.items);
  if (!calls.length) return null;
  return (
    <section aria-labelledby="callsheet" className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <h2 id="callsheet" className="text-[15px] font-semibold">Call sheet</h2>
        <p className="text-[13px] text-muted">Ranked by warmth, geography and signal strength</p>
      </div>
      <ol>
        {calls.map((item, i) => {
          const t = TEMP_CLASS[tempOf(item.warmth)];
          return (
            <li key={item.id} className="border-b border-line last:border-0">
              <a
                href={`#lead-${item.id}`}
                className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-raised sm:grid-cols-[1.5rem_11rem_1fr_9rem] sm:px-6"
              >
                <span className="text-sm text-muted">{i + 1}</span>
                <span className="truncate font-medium">{item.company || "Unnamed"}</span>
                <span className="col-start-2 row-start-2 truncate text-sm text-ink-2 sm:col-start-auto sm:row-start-auto">
                  {item.headline}
                </span>
                <span className="col-start-3 row-span-2 row-start-1 flex items-center gap-2 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-line sm:w-20">
                    <span className={`bar-in absolute inset-y-0 left-0 rounded-full ${t.bg}`} style={{ width: `${item.warmth}%`, animationDelay: `${i * 60}ms` }} />
                  </span>
                  <span className={`w-7 text-right text-sm font-semibold tabular-nums ${t.text}`}>{item.warmth}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Briefing({ digest, leads, admin }: { digest: Digest; leads: Record<string, Lead>; admin: boolean }) {
  const c = digest.coverage;
  const week = isoWeek(new Date(`${digest.weekOf}T00:00:00Z`));
  const bySignal = Object.entries(c.relevantBySignal ?? {}) as [SignalType, number][];

  return (
    <div>
      <p className="text-sm text-muted">
        Week {week} briefing, {longDate(c.windowStart)} to {longDate(c.windowEnd)}
        {digest.backfilled && <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs">Rebuilt from dated news searches</span>}
      </p>
      <h1 className="mt-3 max-w-[30ch] text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-balance sm:text-[40px]">
        {digest.summary.headline}
      </h1>
      <ul className="mt-6 max-w-[68ch] space-y-2.5 text-[16px] leading-relaxed text-ink-2">
        {digest.summary.bullets.map((b) => (
          <li key={b} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-line-strong">
            {b}
          </li>
        ))}
      </ul>

      <CallSheet digest={digest} />

      <LeadBoard digestId={digest.id} items={digest.items} initialLeads={leads} admin={admin} />

      <details className="group mt-14 rounded-2xl border border-line bg-surface px-5 py-4 sm:px-6">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-medium">
          What the Radar read this week
          <span className="text-sm font-normal text-muted group-open:hidden">Show coverage</span>
          <span className="hidden text-sm font-normal text-muted group-open:inline">Hide</span>
        </summary>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {[
            [c.queries, "searches from your sectors and places"],
            [c.fetched, "articles fetched"],
            [c.unique, "unique stories in the window"],
            [c.relevant, `relevant to your sectors`],
            [c.alreadySeen, "already in an earlier briefing"],
            [c.clusters, "distinct developments"],
            [c.distilled, "analysed and verified by Gemini"],
            [c.feedFailures.length, "feed requests failed and were skipped"],
          ].map(([n, label]) => (
            <div key={label as string}>
              <dt className="text-[22px] font-semibold tracking-tight tabular-nums">{n}</dt>
              <dd className="text-[13px] leading-snug text-muted">{label}</dd>
            </div>
          ))}
        </dl>
        {bySignal.length > 0 && (
          <p className="mt-5 text-sm text-ink-2">
            Relevant stories by signal:{" "}
            {bySignal.map(([k, n], i) => (
              <span key={k}>
                {i > 0 && ", "}
                {SIGNAL_LABEL[k].toLowerCase()} {n}
              </span>
            ))}
            . Searched {digest.sectors.join(", ")} across {digest.geographies.join(", ")}. Model: {c.model}.
          </p>
        )}
      </details>
    </div>
  );
}
