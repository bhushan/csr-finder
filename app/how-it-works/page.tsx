import type { Metadata } from "next";
import { Suspense } from "react";
import { latestDigest } from "@/lib/repo";
import { groupItems } from "@/lib/digest-view";
import { FunnelChart } from "@/components/motion/FunnelChart";

export const metadata: Metadata = { title: "How it works" };

async function Funnel() {
  const row = await latestDigest();
  if (!row) return null;
  const c = row.data.coverage;
  const calls = groupItems(row.data.items).calls.length;
  const steps = [
    { n: c.fetched, label: "articles fetched from live feeds" },
    { n: c.unique, label: "unique stories from the past week" },
    { n: c.relevant, label: "judged relevant by Gemini" },
    { n: c.distilled, label: "developments analysed and verified" },
    { n: calls, label: "worth a call this week" },
  ];
  return <FunnelChart steps={steps} />;
}

const stages = [
  { title: "A schedule that matches your week", body: "Vercel Cron starts the run every Monday at 7:30 am IST, before outreach begins. Admins can also run it on demand from Settings and watch it progress.", where: "vercel.ts, app/api/cron/weekly, app/api/run" },
  { title: "Searches built from your footprint", body: "Each focus sector becomes three searches (new initiatives, partner calls, bigger allocations), plus searches for your priority places and for CSR policy and rule changes.", where: "lib/sources/queries.ts" },
  { title: "Live news, two sources", body: "Every search runs against Google News and Bing News (India edition, past seven days). A feed that fails is logged and skipped, never fatal.", where: "lib/sources/feeds.ts" },
  { title: "Cleaning", body: "Old items are dropped, the same story from different outlets is merged, and anything already covered in an earlier briefing is left out.", where: "lib/pipeline/normalize.ts" },
  { title: "Gemini reads every headline", body: "Gemini Flash screens all stories in batches: is it relevant, which signal is it, which company, sector and place, and which other stories describe the same event.", where: "lib/ai/gemini.ts, lib/ai/prompts.ts" },
  { title: "One development per event", body: "Coverage of the same announcement is grouped, duplicates by the same company are merged, and companies you excluded are removed.", where: "lib/pipeline/cluster.ts" },
  { title: "Gemini checks and decides", body: "For each development Gemini Flash searches the web to confirm facts and the company's CSR track record, then writes what happened, why it matters to you, a call, watch or skip decision, a warmth score, an opening line and who to approach.", where: "lib/ai/gemini.ts" },
  { title: "Explainable ranking", body: "Warmth is combined with signal strength, geography tier and coverage into one score, and companies seen in earlier weeks are flagged as warming up.", where: "lib/pipeline/score.ts, lib/repo.ts" },
  { title: "Briefing, email and follow-up", body: "Gemini writes the summary, the briefing is saved and emailed, and each lead can be tracked through your pipeline with a drafted first email.", where: "lib/digest-service.ts, lib/email, app/pipeline" },
];

const stack = [
  ["Web app and API", "Next.js on Vercel", "app/, components/"],
  ["Scheduler", "Vercel Cron, Mondays 02:00 UTC", "vercel.ts"],
  ["News sources", "Google News RSS, Bing News RSS", "lib/sources"],
  ["AI", "Gemini Flash with structured output and Google Search grounding", "lib/ai"],
  ["Pipeline", "Plain TypeScript steps with unit tests", "lib/pipeline, tests/"],
  ["Database", "Neon Postgres via Vercel Marketplace, Drizzle ORM", "lib/db, lib/repo.ts"],
  ["Email", "Resend", "lib/email"],
  ["Access", "Admin passcode with a signed cookie", "lib/admin.ts"],
];

export default function HowItWorks() {
  return (
    <div>
      <h1 className="max-w-[24ch] text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">
        From a week of news to a short list of calls
      </h1>
      <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-ink-2">
        Most relevant CSR announcements never reach a partnerships team in time. The Radar reads them all every week and keeps only what
        deserves a conversation, with the evidence attached.
      </p>

      <Suspense fallback={<div className="mt-10 h-64 animate-pulse rounded-2xl bg-line" />}>
        <Funnel />
      </Suspense>

      <h2 className="mt-16 text-[22px] font-semibold tracking-tight">Components map</h2>
      <p className="mt-1 text-ink-2">The weekly run, step by step, with where each step lives in the code.</p>
      <ol className="relative mt-6 space-y-6 border-l border-line pl-8">
        {stages.map((s, i) => (
          <li key={s.title} className="relative">
            <span className="absolute -left-[45px] flex size-7 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-semibold text-ink-2">
              {i + 1}
            </span>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{s.body}</p>
            <p className="mt-1 text-[13px] text-muted">{s.where}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 text-[22px] font-semibold tracking-tight">Stack</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Component</th>
              <th className="px-5 py-3 font-medium">Technology</th>
              <th className="px-5 py-3 font-medium">Code</th>
            </tr>
          </thead>
          <tbody>
            {stack.map(([c, t, f]) => (
              <tr key={c} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-medium">{c}</td>
                <td className="px-5 py-3 text-ink-2">{t}</td>
                <td className="px-5 py-3 text-muted">{f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-16 text-[22px] font-semibold tracking-tight">How the Radar stays honest</h2>
      <ul className="mt-4 max-w-[68ch] space-y-2.5 text-[15px] leading-relaxed text-ink-2">
        <li>Every lead links to its original articles, and says whether Gemini confirmed it with a web search or only had the headline.</li>
        <li>Gemini is instructed never to invent amounts, people or deadlines. Contacts are named only when a source names them.</li>
        <li>If Gemini is unavailable, a story still appears as a watch item with its headline instead of silently disappearing.</li>
        <li>Each briefing shows exactly how many articles were read, skipped and analysed.</li>
      </ul>
    </div>
  );
}
