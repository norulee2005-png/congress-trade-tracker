'use client';

// Segment-level error boundary: catches errors within this route segment and its children.
// Rendered when an unhandled error is thrown during rendering or data fetching.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
        문제가 발생했습니다
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {error.message || '페이지를 불러오는 중 오류가 발생했습니다.'}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-zinc-400">오류 코드: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        다시 시도
      </button>
    </div>
  );
}
