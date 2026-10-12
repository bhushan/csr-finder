import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { DigestView } from "@/components/DigestView";
import { DigestSkeleton } from "@/components/Skeleton";
import { latestDigest } from "@/lib/repo";

async function Latest() {
  await connection();
  const row = await latestDigest();
  if (!row) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8">
        <h1 className="text-2xl font-semibold">No digest yet</h1>
        <p className="mt-2 text-muted">
          The first digest is generated on Monday at 7:30 IST, or on demand. It scans the past seven days of Indian business news
          for CSR moves in your sectors and tells you which are worth a call.
        </p>
        <Link href="/settings" className="mt-5 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          Run the first digest
        </Link>
      </div>
    );
  }
  return <DigestView digest={row.data} />;
}

export default function Home() {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <Latest />
    </Suspense>
  );
}
