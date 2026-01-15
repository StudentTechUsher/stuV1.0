/**
 * Loading skeleton for UnifiedAcademicCard
 * Fixed dimensions to prevent layout jitter during loading
 */
export function UnifiedAcademicCardSkeleton() {
  return (
    <div className="min-h-[560px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Header Skeleton - matches UserHeaderBar dimensions */}
      <div className="bg-zinc-900 dark:bg-zinc-800 p-5">
        <div className="flex items-center gap-5">
          {/* Avatar skeleton */}
          <div className="h-14 w-14 rounded-full bg-zinc-700 animate-pulse" />
          <div className="flex-1 space-y-2">
            {/* Name skeleton */}
            <div className="h-6 w-48 rounded bg-zinc-700 animate-pulse" />
            {/* Badge + credits skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-20 rounded-md bg-zinc-700 animate-pulse" />
              <div className="h-4 w-28 rounded bg-zinc-600 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 space-y-5">
        {/* Overall Progress Bar Skeleton */}
        <div className="h-16 w-full rounded-2xl bg-[var(--muted)] animate-pulse" />

        {/* Summary Stats Row Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {/* GPA card skeleton */}
          <div className="h-20 rounded-xl bg-gradient-to-br from-[var(--muted)] to-[var(--muted)] animate-pulse" />
          {/* Graduation date skeleton */}
          <div className="h-20 rounded-xl border border-[var(--border)] bg-[var(--muted)] animate-pulse" />
          {/* Calculator skeleton */}
          <div className="h-20 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] animate-pulse" />
        </div>

        {/* Category Tabs Skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 flex-1 rounded-xl bg-[var(--muted)] animate-pulse"
            />
          ))}
        </div>

        {/* Progress Overview Card Skeleton */}
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--muted)_50%,transparent)] p-6 space-y-4">
          {/* Header row skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 rounded bg-[var(--muted)] animate-pulse" />
            <div className="h-5 w-32 rounded bg-[var(--muted)] animate-pulse" />
          </div>

          {/* Progress bar skeleton */}
          <div className="h-14 w-full rounded-xl bg-[var(--muted)] animate-pulse" />

          {/* Status badges skeleton */}
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="h-3 w-16 rounded bg-[var(--muted)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
