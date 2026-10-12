import { LeadBoard } from "@/components/LeadBoard";
import { BriefingIntro } from "@/components/motion/BriefingIntro";
import { SmoothDetails } from "@/components/motion/SmoothDetails";
import { groupItems, SIGNAL_LABEL } from "@/lib/digest-view";
import type { Lead } from "@/lib/leads";
import type { Digest, SignalType } from "@/lib/types";
import { isoWeek, TEMP_CLASS, tempOf } from "@/lib/warmth";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

function heroLine(calls: number) {
  if (calls === 0) return "Nothing urgent to call about this week.";
  const n = WORDS[calls] ?? String(calls);
  return `${n} ${calls === 1 ? "call" : "calls"} worth making this week.`;
}

function CallSheet({ digest }: { digest: Digest }) {
  const { calls } = groupItems(digest.items);
  if (!calls.length) return null;
  return (
    <section data-anim="sheet" aria-labelledby="callsheet" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3.5">
        <h2 id="callsheet" className="text-[15px] font-semibold">Call sheet</h2>
        <p className="text-[13px] text-muted">Warmest first</p>
      </div>
      <ol>
        {calls.map((item, i) => {
          const t = TEMP_CLASS[tempOf(item.warmth)];
          return (
            <li key={item.id} data-anim="row" className="border-b border-line last:border-0">
              <a href={`#lead-${item.id}`} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 px-5 py-3 transition-colors hover:bg-raised">
                <span className="text-sm tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.company || "Unnamed"}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {SIGNAL_LABEL[item.signalType]}
                    {item.geography ? `, ${item.geography}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-line">
                    <span data-bar className={`absolute inset-y-0 left-0 rounded-full ${t.bg}`} style={{ width: `${item.warmth}%` }} />
                  </span>
                  <span data-count={item.warmth} className={`w-6 text-right text-sm font-semibold tabular-nums ${t.text}`}>{item.warmth}</span>
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

  const callCount = groupItems(digest.items).calls.length;

  return (
    <BriefingIntro>
      <p data-anim="eyebrow" className="text-sm text-muted">
        Week {week} briefing, {longDate(c.windowStart)} to {longDate(c.windowEnd)}
        {digest.backfilled && <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs">Rebuilt from dated news searches</span>}
      </p>

      <div className="mt-4 grid gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-x-12 lg:gap-y-5">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 data-anim="hero" className="max-w-[14ch] text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-balance sm:text-[56px]">
            {heroLine(callCount)}
          </h1>
          <p data-anim="deck" className="mt-6 max-w-[56ch] text-[18px] leading-relaxed text-ink">{digest.summary.headline}</p>
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ul data-anim="bullets" className="max-w-[60ch] space-y-2.5 text-[15px] leading-relaxed text-ink-2">
            {digest.summary.bullets.map((b) => (
              <li key={b} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-line-strong">
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="row-start-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <CallSheet digest={digest} />
          <div data-anim="sheet">
          <SmoothDetails
            countOnOpen
            className="group mt-3 rounded-xl px-1"
            summaryClassName="flex cursor-pointer list-none items-start justify-between gap-3 rounded-lg py-1 text-[13px] leading-snug text-muted hover:text-ink"
            summary={
              <>
                <span>
                  Read {c.unique} stories from the past week; {c.relevant} were relevant and {c.distilled} were analysed in depth.
                </span>
                <span className="shrink-0 font-medium text-ink-2 underline decoration-line-strong underline-offset-2 group-open:hidden">Details</span>
                <span className="hidden shrink-0 font-medium text-ink-2 underline decoration-line-strong underline-offset-2 group-open:inline">Hide</span>
              </>
            }
          >
            <div className="mt-2 rounded-xl border border-line bg-surface p-4">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                {[
                  [c.queries, "searches from your sectors and places"],
                  [c.fetched, "articles fetched"],
                  [c.unique, "unique stories in the window"],
                  [c.alreadySeen, "already in an earlier briefing"],
                  [c.relevant, "relevant to your sectors"],
                  [c.clusters, "distinct developments"],
                  [c.distilled, "analysed and verified by Gemini"],
                  [c.feedFailures.length, "feed requests failed and were skipped"],
                ].map(([n, label]) => (
                  <div key={label as string}>
                    <dt data-count={n} className="text-[20px] font-semibold tracking-tight tabular-nums">{n}</dt>
                    <dd className="text-[12px] leading-snug text-muted">{label}</dd>
                  </div>
                ))}
              </dl>
              {bySignal.length > 0 && (
                <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-2">
                  Relevant by signal:{" "}
                  {bySignal.map(([k, n], i) => (
                    <span key={k}>
                      {i > 0 && ", "}
                      {SIGNAL_LABEL[k].toLowerCase()} {n}
                    </span>
                  ))}
                  . Searched {digest.sectors.join(", ")} across {digest.geographies.join(", ")} with {c.model}.
                </p>
              )}
            </div>
          </SmoothDetails>
          </div>
        </div>
      </div>

      <div data-anim="rest">
        <LeadBoard digestId={digest.id} items={digest.items} initialLeads={leads} admin={admin} />
      </div>
    </BriefingIntro>
  );
}
