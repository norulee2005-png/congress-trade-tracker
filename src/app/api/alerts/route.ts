import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { alerts, users } from '@/db/schema';
import { getSession } from '@/lib/auth-session';

const ALLOWED_TYPES = ['politician', 'stock', 'large_trade'] as const;
const ALLOWED_CHANNELS = ['email', 'discord'] as const;

// GET /api/alerts — list all alerts for the current user
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, session.userId), eq(alerts.isActive, true)));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[Alerts] GET error:', err);
    return NextResponse.json({ error: '알림 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// POST /api/alerts — create a new alert
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = await req.json();
  const { alertType, targetId, channel, channelConfig } = body;

  if (!ALLOWED_TYPES.includes(alertType)) {
    return NextResponse.json({ error: '유효하지 않은 알림 유형입니다.' }, { status: 400 });
  }
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: '유효하지 않은 알림 채널입니다.' }, { status: 400 });
  }
  if (channel === 'discord' && (!channelConfig?.webhookUrl || typeof channelConfig.webhookUrl !== 'string')) {
    return NextResponse.json({ error: 'Discord 웹훅 URL이 필요합니다.' }, { status: 400 });
  }

  // Pro gate: discord channel and large_trade alerts require Pro
  const userRows = await db.select({ subscriptionTier: users.subscriptionTier }).from(users).where(eq(users.id, session.userId)).limit(1);
  const isPro = userRows[0]?.subscriptionTier === 'pro';

  if ((channel === 'discord' || alertType === 'large_trade') && !isPro) {
    return NextResponse.json({ error: '이 기능은 Pro 구독이 필요합니다.' }, { status: 403 });
  }

  const configJson = channel === 'discord' ? JSON.stringify({ webhookUrl: channelConfig.webhookUrl }) : null;

  // Normalize stock ticker to uppercase for consistent matching
  const normalizedTargetId = alertType === 'stock' && targetId
    ? String(targetId).toUpperCase().trim()
    : targetId ?? null;

  try {
    const created = await db.insert(alerts).values({
      userId: session.userId,
      alertType,
      targetId: normalizedTargetId,
      channel,
      channelConfig: configJson,
      isActive: true,
    }).returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch (err) {
    console.error('[Alerts] POST error:', err);
    return NextResponse.json({ error: '알림 생성에 실패했습니다.' }, { status: 500 });
  }
}
