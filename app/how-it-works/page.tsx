import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works · CSR Partnership Radar" };

const stages = [
  { n: 1, title: "Schedule", body: "Vercel Cron fires every Monday at 07:30 IST. Admins can also run it on demand from Settings.", where: "vercel.ts · /api/cron/weekly · /api/run" },
  { n: 2, title: "Build searches", body: "Your sectors and geographies become ~20 targeted searches: new initiatives, partner calls, bigger allocations, place-specific and CSR policy.", where: "lib/sources/queries.ts" },
  { n: 3, title: "Collect live news", body: "Every search runs against Google News and Bing News RSS (India edition, past 7 days). Failed feeds are recorded, not fatal.", where: "lib/sources/feeds.ts" },
  { n: 4, title: "Clean", body: "Keep only the look-back window, merge duplicate stories across outlets, drop anything already covered in an earlier week.", where: "lib/pipeline/normalize.ts" },
  { n: 5, title: "Gemini triage", body: "Gemini Flash screens every headline in batches: relevant or not, signal type, company, sectors, geography, and a story key to group coverage.", where: "lib/ai/gemini.ts · prompts.ts" },
  { n: 6, title: "Group", body: "Articles about the same event are merged into one development; excluded companies are removed.", where: "lib/pipeline/cluster.ts" },
  { n: 7, title: "Gemini analysis", body: "For each development Gemini Flash cross-checks with Google Search and writes: what happened, why it matters to you, call / watch / skip, warmth, opening angle, who to approach.", where: "lib/ai/gemini.ts" },
  { n: 8, title: "Rank", body: "A transparent score combines Gemini's warmth with signal type, geography tier and coverage, so ordering is explainable.", where: "lib/pipeline/score.ts" },
  { n: 9, title: "Summarise, store, deliver", body: "Gemini writes the Monday summary; the digest is saved to Postgres and emailed through Resend, with the full version on this site.", where: "lib/digest-service.ts · lib/email" },
];

const components = [
  ["Web app", "Next.js App Router on Vercel", "app/, components/"],
  ["Scheduler", "Vercel Cron (Mon 02:00 UTC)", "vercel.ts, app/api/cron/weekly"],
  ["News sources", "Google News RSS, Bing News RSS", "lib/sources"],
  ["AI", "Gemini Flash via @google/genai (structured JSON, Google Search grounding)", "lib/ai"],
  ["Pipeline", "Pure TypeScript steps, unit tested", "lib/pipeline"],
  ["Database", "Neon Postgres via Vercel Marketplace, Drizzle ORM", "lib/db, lib/repo.ts"],
  ["Email", "Resend via Vercel Marketplace", "lib/email"],
  ["Access", "Admin passcode, HMAC cookie", "lib/admin.ts, app/settings"],
];

export default function HowItWorks() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every Monday the Radar reads the past week of Indian business news, keeps what matters for an education and skilling NGO, and
        turns each development into one decision: is this worth a call this week?
      </p>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-accent">Components map</h2>
      <ol className="mt-4 space-y-3">
        {stages.map((s) => (
          <li key={s.n} className="relative rounded-lg border border-line bg-surface p-4 pl-14">
            <span className="absolute left-4 top-4 flex size-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {s.n}
            </span>
            <div className="font-medium">{s.title}</div>
            <p className="mt-1 text-sm leading-relaxed">{s.body}</p>
            <p className="mt-1 font-mono text-xs text-muted">{s.where}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-accent">Stack</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Component</th>
              <th className="px-4 py-2 font-medium">Technology</th>
              <th className="px-4 py-2 font-medium">Code</th>
            </tr>
          </thead>
          <tbody>
            {components.map(([c, t, f]) => (
              <tr key={c} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-medium">{c}</td>
                <td className="px-4 py-2">{t}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-accent">Honesty rules</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
        <li>Every item links to the original articles; items cross-checked with Google Search are marked, others say they are headline-only.</li>
        <li>Gemini is told never to invent amounts, people or deadlines; missing facts are left blank.</li>
        <li>If Gemini is unavailable, items still appear as &quot;watch&quot; with the headline, rather than silently disappearing.</li>
        <li>The coverage panel on each digest shows exactly how many articles were scanned, skipped and analysed.</li>
      </ul>
    </div>
  );
}
