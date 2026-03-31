import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth-session';
import { getStripe } from '@/lib/stripe-client';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const userRows = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const customerId = userRows[0]?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: 'Stripe 계정을 찾을 수 없습니다.' }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('[Stripe] portal error:', err);
    return NextResponse.json({ error: '포털 세션 생성에 실패했습니다.' }, { status: 500 });
  }
}
