import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth-session';
import AccountActions from '@/components/account-actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '내 계정' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const userRows = await db
    .select({
      email: users.email,
      subscriptionTier: users.subscriptionTier,
      subscriptionEndsAt: users.subscriptionEndsAt,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (userRows.length === 0) redirect('/login');
  const user = userRows[0];
  const { upgraded } = await searchParams;
  const isPro = user.subscriptionTier === 'pro';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">내 계정</h1>

      {upgraded && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          🎉 Pro 구독이 완료되었습니다!
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">이메일</p>
            <p className="mt-1 font-medium">{user.email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPro ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
            {isPro ? 'Pro' : '무료'}
          </span>
        </div>

        {!isPro && user.subscriptionEndsAt && (
          <p className="mt-3 text-sm text-zinc-500">
            구독 종료일: {new Date(user.subscriptionEndsAt).toLocaleDateString('ko-KR')}
          </p>
        )}

        <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Pro 혜택</h2>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>✓ 전체 거래 히스토리 (2년+)</li>
            <li>✓ 고급 필터 및 내보내기</li>
            <li>✓ Discord 웹훅 알림</li>
            <li>✓ 대형 거래($100K+) 즉시 알림</li>
          </ul>
          {!isPro && (
            <p className="mt-3 text-sm font-medium text-blue-600">
              월 $9.99 · 언제든 해지 가능
            </p>
          )}
        </div>
      </div>

      <AccountActions isPro={isPro} hasStripeCustomer={!!user.stripeCustomerId} />
    </div>
  );
}
