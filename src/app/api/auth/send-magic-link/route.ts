import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, createMagicLinkToken, sendMagicLinkEmail } from '@/lib/magic-link-service';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일 주소를 입력하세요.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userId = await findOrCreateUser(normalizedEmail);
    const token = await createMagicLinkToken(userId);
    await sendMagicLinkEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Auth] send-magic-link error:', err);
    return NextResponse.json({ error: '이메일 전송에 실패했습니다. 다시 시도해주세요.' }, { status: 500 });
  }
}
