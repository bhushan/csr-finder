import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Briefing } from "@/components/Briefing";
import { BriefingSkeleton } from "@/components/Skeleton";
import { briefingProps } from "@/lib/briefing-data";
import { getDigest } from "@/lib/repo";

async function DigestById({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getDigest(id);
  if (!row) notFound();
  return <Briefing {...await briefingProps(row.data)} />;
}

export default function DigestPage(props: PageProps<"/digests/[id]">) {
  return (
    <div>
      <Link href="/digests" className="text-sm text-muted hover:text-ink">Back to archive</Link>
      <div className="mt-6">
        <Suspense fallback={<BriefingSkeleton />}>
          <DigestById params={props.params} />
        </Suspense>
      </div>
    </div>
  );
}
