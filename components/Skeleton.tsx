export function DigestSkeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-4">
      <div className="h-3 w-48 rounded bg-line" />
      <div className="h-8 w-3/4 rounded bg-line" />
      <div className="h-4 w-full rounded bg-line" />
      <div className="h-4 w-5/6 rounded bg-line" />
      <div className="mt-8 h-40 rounded-lg bg-line" />
      <div className="h-40 rounded-lg bg-line" />
    </div>
  );
}
