import { Skeleton } from '@/components/skeleton';

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Filter form area */}
      <section className="rounded-xl border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </section>

      {/* Results table */}
      <section className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="mt-0.5 h-5 w-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-10 rounded-full" />
                  </div>
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
