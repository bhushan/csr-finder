import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listDigests } from "@/lib/repo";
import { formatWeek } from "@/lib/week";
import { isoWeek } from "@/lib/warmth";

export const metadata: Metadata = { title: "Archive" };

async function Archive() {
  await connection();
  const rows = await listDigests();
  if (!rows.length) return <p className="mt-8 text-muted">No briefings yet. The first one appears after Monday&apos;s run.</p>;
  const max = Math.max(...rows.map((r) => Number(r.items)), 1);
  return (
    <ol className="mt-8 border-l border-line">
      {rows.map((r) => {
        const calls = Number(r.calls);
        const items = Number(r.items);
        return (
          <li key={r.id} className="relative pb-2 pl-6">
            <span className="absolute -left-[5px] top-6 size-2.5 rounded-full border-2 border-bg bg-line-strong" aria-hidden />
            <Link href={`/digests/${r.id}`} className="block rounded-xl px-4 py-4 transition-colors hover:bg-surface">
              <span className="text-sm text-muted">Week {isoWeek(new Date(`${r.weekOf}T00:00:00Z`))}, from {formatWeek(r.weekOf)}</span>
              <span className="mt-1 block max-w-[70ch] text-[17px] font-medium leading-snug">{r.headline}</span>
              <span className="mt-3 flex items-center gap-3 text-[13px] text-ink-2">
                <span className="flex h-1.5 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="bg-hot" style={{ width: `${(calls / max) * 100}%` }} />
                  <span className="bg-cold" style={{ width: `${((items - calls) / max) * 100}%` }} />
                </span>
                {calls} to call, {items - calls} to watch or skip
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export default function DigestsPage() {
  return (
    <div>
      <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Archive</h1>
      <p className="mt-2 text-ink-2">Every Monday briefing, newest first. Companies that keep reappearing are flagged as warming up.</p>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-line" />}>
        <Archive />
      </Suspense>
    </div>
  );
}
