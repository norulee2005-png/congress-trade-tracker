import { Skeleton } from '@/components/skeleton';

export default function BlogPostLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <Skeleton className="h-4 w-20" />
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Post header */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </section>

      {/* Article body */}
      <section className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 5 === 4 ? 'w-2/3' : 'w-full'}`} />
        ))}
        <div className="py-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i + 8} className={`h-4 ${i % 4 === 3 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </section>

      {/* Share buttons */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}
