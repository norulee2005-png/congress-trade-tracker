'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountActions({
  isPro,
  hasStripeCustomer,
}: {
  isPro: boolean;
  hasStripeCustomer: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading('upgrade');
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  async function handlePortal() {
    setLoading('portal');
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  async function handleSignout() {
    setLoading('signout');
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {!isPro && (
        <button
          onClick={handleUpgrade}
          disabled={loading === 'upgrade'}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === 'upgrade' ? '처리 중...' : 'Pro로 업그레이드'}
        </button>
      )}
      {isPro && hasStripeCustomer && (
        <button
          onClick={handlePortal}
          disabled={loading === 'portal'}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading === 'portal' ? '처리 중...' : '구독 관리'}
        </button>
      )}
      <Link
        href="/alerts"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        알림 설정
      </Link>
      <button
        onClick={handleSignout}
        disabled={loading === 'signout'}
        className="rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {loading === 'signout' ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  );
}
