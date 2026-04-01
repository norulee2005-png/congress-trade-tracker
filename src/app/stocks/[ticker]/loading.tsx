import { Skeleton } from '@/components/skeleton';

export default function StockLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Stock header */}
      <section className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </section>

      {/* Monthly trend placeholder */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </section>

      {/* Trade table */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="mt-0.5 h-5 w-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="shrink-0 space-y-1 text-right">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
