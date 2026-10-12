import Link from "next/link";
import { Suspense } from "react";
import { Briefing } from "@/components/Briefing";
import { BriefingSkeleton } from "@/components/Skeleton";
import { briefingProps } from "@/lib/briefing-data";
import { latestDigest } from "@/lib/repo";

async function Latest() {
  const row = await latestDigest();
  if (!row) {
    return (
      <div className="max-w-xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Your first briefing arrives Monday at 7:30 am.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
          The Radar reads the past week of Indian business news for companies moving on education and skilling CSR, and tells you which
          ones are worth a call. You can also run it now.
        </p>
        <Link href="/settings" className="mt-6 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink">
          Run the first briefing
        </Link>
      </div>
    );
  }
  return <Briefing {...await briefingProps(row.data)} />;
}

export default function Home() {
  return (
    <Suspense fallback={<BriefingSkeleton />}>
      <Latest />
    </Suspense>
  );
}
