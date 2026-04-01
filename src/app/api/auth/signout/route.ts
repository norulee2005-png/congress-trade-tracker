import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth-session';

export async function POST(_req: NextRequest) {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Auth] signout error:', err);
    return NextResponse.json({ error: '로그아웃 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
