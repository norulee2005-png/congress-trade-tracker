import Link from 'next/link';

interface ProGateProps {
  message?: string;
  children?: React.ReactNode;
}

/**
 * Renders a Pro-upgrade prompt over gated content.
 * Use as a server component — check session tier before rendering.
 */
export default function ProGate({
  message = '이 기능은 Pro 구독 전용입니다.',
  children,
}: ProGateProps) {
  return (
    <div className="relative">
      {/* Blurred preview content */}
      {children && (
        <div className="pointer-events-none select-none blur-sm" aria-hidden>
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <p className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">{message}</p>
        <Link
          href="/account"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Pro로 업그레이드
        </Link>
      </div>
    </div>
  );
}
