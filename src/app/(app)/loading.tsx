function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sky-100/80 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-live="polite" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-4 w-64 max-w-[70vw]" />
        </div>
        <SkeletonBlock className="h-10 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="finance-card-shadow rounded-lg border border-sky-100/80 bg-white/80 p-4 ring-1 ring-white/70"
          >
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-5 h-8 w-36" />
            <SkeletonBlock className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="finance-card-shadow rounded-lg border border-sky-100/80 bg-white/80 p-4 ring-1 ring-white/70">
        <div className="mb-5 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
