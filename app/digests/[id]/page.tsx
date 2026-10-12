import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DigestView } from "@/components/DigestView";
import { DigestSkeleton } from "@/components/Skeleton";
import { getDigest } from "@/lib/repo";

async function DigestById({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getDigest(id);
  if (!row) notFound();
  return <DigestView digest={row.data} />;
}

export default function DigestPage(props: PageProps<"/digests/[id]">) {
  return (
    <div>
      <Link href="/digests" className="text-sm text-muted hover:text-ink">← Archive</Link>
      <div className="mt-4">
        <Suspense fallback={<DigestSkeleton />}>
          <DigestById params={props.params} />
        </Suspense>
      </div>
    </div>
  );
}
