import { NextResponse } from 'next/server';
import { db } from '@/db/db-client';
import { trades } from '@/db/schema';
import { desc, sql, gte } from 'drizzle-orm';

/**
 * Pipeline health check endpoint.
 * Returns data freshness metrics — use for monitoring alerts.
 * No auth required (returns aggregate stats only, no PII).
 */
export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Most recent trade by created_at (when our pipeline last inserted)
    const [latestTrade] = await db
      .select({
        createdAt: trades.createdAt,
        disclosureDate: trades.disclosureDate,
      })
      .from(trades)
      .orderBy(desc(trades.createdAt))
      .limit(1);

    // Count of trades inserted in last 7 days
    const [recentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trades)
      .where(gte(trades.createdAt, sevenDaysAgo));

    // Total trade count
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trades);

    const lastInsertedAt = latestTrade?.createdAt?.toISOString() ?? null;
    const hoursSinceLastInsert = lastInsertedAt
      ? (Date.now() - new Date(lastInsertedAt).getTime()) / (1000 * 60 * 60)
      : null;

    // Healthy if data was inserted within 25 hours (>1 cron cycle buffer)
    const isHealthy = hoursSinceLastInsert !== null && hoursSinceLastInsert < 25;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'stale',
      lastInsertedAt,
      hoursSinceLastInsert: hoursSinceLastInsert !== null ? Math.round(hoursSinceLastInsert * 10) / 10 : null,
      recentTradesLast7d: recentCount?.count ?? 0,
      totalTrades: totalCount?.count ?? 0,
      checkedAt: new Date().toISOString(),
    }, { status: isHealthy ? 200 : 503 });
  } catch (err) {
    console.error('[Health] pipeline check failed:', err);
    return NextResponse.json({
      status: 'error',
      error: 'Pipeline health check failed',
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
