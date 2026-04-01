'use client';

// Global error boundary: catches errors in the root layout and all segments.
// Must render <html> and <body> since it replaces the root layout when active.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-zinc-950">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          심각한 오류가 발생했습니다
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {error.message || '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
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
      </body>
    </html>
  );
}
