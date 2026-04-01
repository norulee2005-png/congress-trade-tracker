import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { alerts, users } from '@/db/schema';
import { getSession } from '@/lib/auth-session';
import AlertsManager from '@/components/alerts-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '알림 설정',
  alternates: {
    canonical: '/alerts',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AlertsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const userRows = await db
    .select({ subscriptionTier: users.subscriptionTier })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (userRows.length === 0) redirect('/login');
  const isPro = userRows[0].subscriptionTier === 'pro';

  const userAlerts = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.userId, session.userId), eq(alerts.isActive, true)));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">알림 설정</h1>
      <p className="mb-3 text-sm text-zinc-500">
        관심 있는 의원이나 종목에 새 거래가 공시되면 즉시 이메일로 알려드립니다.
      </p>

      {/* Onboarding value proposition */}
      <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">알림이 왜 유용한가요?</p>
        <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400 list-none">
          <li>— 낸시 펠로시·댄 크렌쇼 등 주요 의원의 신규 거래를 실시간 감지</li>
          <li>— NVDA·TSLA 등 인기 종목에 의원 매수·매도가 생기면 즉시 통보</li>
          <li>— STOCK Act 공시는 최대 45일 지연 — 알림으로 누구보다 빠르게 확인</li>
        </ul>
      </div>

      <AlertsManager initialAlerts={userAlerts} isPro={isPro} />
    </div>
  );
}
