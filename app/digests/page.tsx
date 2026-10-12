import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listDigests } from "@/lib/repo";
import { formatWeek } from "@/lib/week";

async function Archive() {
  await connection();
  const rows = await listDigests();
  if (!rows.length) return <p className="mt-6 text-muted">No digests yet. The first one appears after the next Monday run.</p>;
  return (
    <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/digests/${r.id}`} className="block px-5 py-4 hover:bg-bg">
            <div className="text-xs uppercase tracking-wider text-muted">Week of {formatWeek(r.weekOf)}</div>
            <div className="mt-1 font-medium">{r.headline}</div>
            <div className="mt-1 text-sm text-muted">
              {Number(r.calls)} to call · {Number(r.items)} developments
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DigestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
      <p className="mt-1 text-muted">Every Monday digest, newest first.</p>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-lg bg-line" />}>
        <Archive />
      </Suspense>
    </div>
  );
}
