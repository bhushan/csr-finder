export function BriefingSkeleton() {
  return (
    <div aria-busy aria-label="Loading briefing" className="animate-pulse">
      <div className="h-4 w-56 rounded bg-line" />
      <div className="mt-4 h-10 w-4/5 rounded-lg bg-line" />
      <div className="mt-2 h-10 w-3/5 rounded-lg bg-line" />
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full max-w-2xl rounded bg-line" />
        <div className="h-4 w-11/12 max-w-2xl rounded bg-line" />
      </div>
      <div className="mt-10 h-56 rounded-2xl bg-line" />
    </div>
  );
}
