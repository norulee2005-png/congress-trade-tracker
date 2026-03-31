import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth-session';
import { getStripe } from '@/lib/stripe-client';

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const userRows = await db
      .select({ stripeCustomerId: users.stripeCustomerId, subscriptionTier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (userRows.length === 0) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const user = userRows[0];
    if (user.subscriptionTier === 'pro') {
      return NextResponse.json({ error: '이미 Pro 구독 중입니다.' }, { status: 400 });
    }

    // Reuse existing Stripe customer or create new one
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: session.email });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, session.userId));
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/account?upgraded=1`,
      cancel_url: `${baseUrl}/account`,
      metadata: { userId: session.userId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('[Stripe] checkout error:', err);
    return NextResponse.json({ error: '결제 세션 생성에 실패했습니다.' }, { status: 500 });
  }
}
