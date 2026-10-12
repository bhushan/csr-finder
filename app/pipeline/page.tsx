import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { isAdmin } from "@/lib/admin";
import { LEAD_LABEL, type LeadStatus } from "@/lib/leads";
import { activeLeads, getDigest } from "@/lib/repo";
import type { DigestItem } from "@/lib/types";
import { formatWeek } from "@/lib/week";
import { TEMP_CLASS, tempOf } from "@/lib/warmth";

export const metadata: Metadata = { title: "Pipeline" };

const COLUMNS: { status: Exclude<LeadStatus, "new">; hint: string }[] = [
  { status: "to_call", hint: "Picked from a briefing, not yet contacted" },
  { status: "contacted", hint: "Email sent or call made" },
  { status: "meeting", hint: "A conversation is on the calendar" },
  { status: "not_a_fit", hint: "Ruled out, kept for the record" },
];

async function Board() {
  await connection();
  const [leads, admin] = await Promise.all([activeLeads(), isAdmin()]);
  const digests = await Promise.all([...new Set(leads.map((l) => l.digestId))].map(getDigest));
  const itemOf = new Map<string, { item: DigestItem; weekOf: string; digestId: string }>();
  for (const d of digests) if (d) for (const i of d.data.items) itemOf.set(i.id, { item: i, weekOf: d.weekOf, digestId: d.id });

  if (!leads.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="font-medium">No leads in your pipeline yet.</p>
        <p className="mt-1 text-sm text-muted">
          {admin
            ? "Set a status on any lead in this week's briefing and it will appear here."
            : "Sign in on Settings, then set a status on any lead in the briefing."}
        </p>
        <Link href="/" className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
          Open this week&apos;s briefing
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const inCol = leads.filter((l) => l.status === col.status);
        return (
          <section key={col.status} className="rounded-2xl bg-surface/60 p-3 ring-1 ring-line">
            <header className="px-2 pb-3 pt-1">
              <h2 className="text-[15px] font-semibold">
                {LEAD_LABEL[col.status]} <span className="font-normal text-muted">{inCol.length}</span>
              </h2>
              <p className="text-[13px] text-muted">{col.hint}</p>
            </header>
            <ul className="space-y-2">
              {inCol.map((l) => {
                const ref = itemOf.get(l.itemId);
                const t = ref ? TEMP_CLASS[tempOf(ref.item.warmth)] : TEMP_CLASS.cold;
                return (
                  <li key={l.itemId}>
                    <Link
                      href={ref ? `/digests/${ref.digestId}#lead-${l.itemId}` : "/digests"}
                      className="block rounded-xl border border-line bg-surface p-3.5 shadow-card transition-colors hover:border-line-strong"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{l.company || "Unnamed"}</span>
                        {ref && <span className={`text-sm font-semibold ${t.text}`}>{ref.item.warmth}</span>}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-2">
                        {ref?.item.headline ?? "From an older briefing"}
                      </span>
                      <span className="mt-2 block text-xs text-muted">
                        {ref ? `Week of ${formatWeek(ref.weekOf)}` : ""}
                        {l.draft ? ", email drafted" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Pipeline</h1>
      <p className="mt-2 max-w-[65ch] text-ink-2">
        Leads you have acted on, across every briefing. Change a lead&apos;s status from its card in the briefing.
      </p>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-line" />}>
        <Board />
      </Suspense>
    </div>
  );
}
