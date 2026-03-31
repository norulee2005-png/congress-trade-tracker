import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users } from '@/db/schema';
import { getStripe } from '@/lib/stripe-client';

// Required for raw body access in Next.js App Router
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) break;
      await db.update(users).set({
        subscriptionTier: 'pro',
        stripeSubscriptionId: String(session.subscription),
        subscriptionEndsAt: null,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(users).set({
        subscriptionTier: 'free',
        subscriptionEndsAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.stripeSubscriptionId, sub.id));
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === 'active';
      await db.update(users).set({
        subscriptionTier: isActive ? 'pro' : 'free',
        subscriptionEndsAt: isActive ? null : new Date(),
        updatedAt: new Date(),
      }).where(eq(users.stripeSubscriptionId, sub.id));
      break;
    }
  }
}
