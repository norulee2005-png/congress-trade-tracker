import { Skeleton } from '@/components/skeleton';

export default function RankingsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Party buy/sell ratio cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </section>

      {/* Two ranking lists side by side */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, col) => (
          <section key={col} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-14 rounded-full" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-10 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom stock table */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-4 shrink-0">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
