import { groupItems, SIGNAL_LABEL } from "@/lib/digest-view";
import type { Digest, DigestItem } from "@/lib/types";
import { formatWeek } from "@/lib/week";

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

const DECISION_STYLE = {
  call_this_week: { label: "Call this week", cls: "bg-accent-soft text-accent" },
  watch: { label: "Watch", cls: "bg-warm-soft text-warm" },
  skip: { label: "Skip", cls: "bg-line text-muted" },
} as const;

function ItemCard({ item }: { item: DigestItem }) {
  const d = DECISION_STYLE[item.decision];
  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-0.5 font-medium ${d.cls}`}>{d.label}</span>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-muted">{SIGNAL_LABEL[item.signalType]}</span>
        {item.geography && <span className="text-muted">{item.geography}{item.geoTier === 1 ? " · home turf" : ""}</span>}
        <span className="ml-auto font-mono text-muted" title="Rank score: Gemini warmth plus signal, geography and coverage boosts">
          warmth {item.warmth} · score {item.score}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug">{item.headline}</h3>
      {(item.company || item.amount) && (
        <p className="mt-1 text-sm text-muted">
          {item.company}
          {item.company && item.amount ? " · " : ""}
          {item.amount}
        </p>
      )}

      <p className="mt-3 text-[15px] leading-relaxed">{item.whatHappened}</p>
      <dl className="mt-3 space-y-2 text-[15px] leading-relaxed">
        <div>
          <dt className="inline font-medium">Why it matters: </dt>
          <dd className="inline">{item.whyItMatters}</dd>
        </div>
        {item.suggestedAngle && (
          <div>
            <dt className="inline font-medium">Opening angle: </dt>
            <dd className="inline">{item.suggestedAngle}</dd>
          </div>
        )}
        {item.contactHint && (
          <div className="text-sm text-muted">
            <dt className="inline">Who to approach: </dt>
            <dd className="inline">{item.contactHint}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
        <span className={item.verified ? "text-accent" : ""}>
          {item.verified ? "✓ Cross-checked with Google Search" : "Based on headlines only, not independently verified"}
        </span>
        <ul className="mt-2 space-y-1">
          {item.sources.slice(0, 4).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink">
                {s.title}
              </a>{" "}
              · {s.source} · {dateFmt(s.publishedAt)}
            </li>
          ))}
        </ul>
        {item.groundingSources.length > 0 && (
          <p className="mt-2">
            Web evidence:{" "}
            {item.groundingSources.map((g, i) => (
              <span key={g.url}>
                {i > 0 && ", "}
                <a href={g.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink">
                  {g.title || "source"}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

function Section({ title, note, items, tone }: { title: string; note: string; items: DigestItem[]; tone: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${tone}`}>
        {title} <span className="text-muted">({items.length})</span>
      </h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <div className="mt-4 space-y-4">
        {items.map((i) => (
          <ItemCard key={i.id} item={i} />
        ))}
      </div>
    </section>
  );
}

export function DigestView({ digest }: { digest: Digest }) {
  const { calls, watch, policy, skipped } = groupItems(digest.items);
  const c = digest.coverage;
  const stats = [
    { n: calls.length, label: "worth a call" },
    { n: watch.length, label: "to watch" },
    { n: policy.length, label: "policy updates" },
    { n: c.unique, label: "articles scanned" },
  ];

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">
        Week of {formatWeek(digest.weekOf)} · generated{" "}
        {new Date(digest.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{digest.summary.headline}</h1>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
        {digest.summary.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface px-4 py-3">
            <div className="text-2xl font-semibold">{s.n}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Call this week" note="Active budget or partner search that fits your programmes." items={calls} tone="text-accent" />
      <Section title="Watch" note="Relevant, not yet actionable. Revisit next week." items={watch} tone="text-warm" />
      <Section title="Policy & regulatory" note="Changes in how companies can deploy CSR funds." items={policy} tone="text-policy" />

      {skipped.length > 0 && (
        <details className="mt-10 rounded-lg border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm text-muted">
            {skipped.length} item{skipped.length === 1 ? "" : "s"} reviewed and skipped
          </summary>
          <div className="mt-4 space-y-4">
            {skipped.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        </details>
      )}

      <details className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm">
        <summary className="cursor-pointer text-muted">Coverage: what was scanned this week</summary>
        <ol className="mt-3 space-y-1 text-muted">
          <li>{c.queries} searches built from your sectors ({digest.sectors.join(", ")}) and geographies ({digest.geographies.join(", ")})</li>
          <li>{c.feedRequests} feed requests to Google News and Bing News{c.feedFailures.length ? `, ${c.feedFailures.length} failed and were skipped` : ", all succeeded"}</li>
          <li>{c.fetched} articles fetched, {c.inWindow} from {dateFmt(c.windowStart)} to {dateFmt(c.windowEnd)}, {c.unique} unique after de-duplication</li>
          <li>{c.alreadySeen} already covered in an earlier digest</li>
          <li>{c.triaged} screened by {c.model}; {c.relevant} relevant, grouped into {c.clusters} developments</li>
          <li>{c.distilled} analysed in depth</li>
        </ol>
      </details>
    </div>
  );
}
