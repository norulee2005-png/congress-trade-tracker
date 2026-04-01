import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, createMagicLinkToken, sendMagicLinkEmail } from '@/lib/magic-link-service';

const rateLimitMap = new Map<string, number>();
const COOLDOWN_MS = 60_000;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
    }

    const lastSent = rateLimitMap.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    rateLimitMap.set(normalizedEmail, Date.now());

    const userId = await findOrCreateUser(normalizedEmail);
    const token = await createMagicLinkToken(userId);
    await sendMagicLinkEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Auth] send-magic-link error:', err);
    return NextResponse.json({ error: '이메일 전송에 실패했습니다. 다시 시도해주세요.' }, { status: 500 });
  }
}
