import { Skeleton } from '@/components/skeleton';

export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Title */}
      <section className="space-y-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-4 w-64" />
      </section>

      {/* Post list */}
      <section className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
