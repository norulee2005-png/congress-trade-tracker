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
      <p className="mb-8 text-sm text-zinc-500">
        관심 있는 의원, 종목, 대형 거래가 공시될 때 알림을 받습니다.
      </p>
      <AlertsManager initialAlerts={userAlerts} isPro={isPro} />
    </div>
  );
}
