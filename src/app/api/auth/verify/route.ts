import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users } from '@/db/schema';
import { consumeMagicLinkToken } from '@/lib/magic-link-service';
import { createSessionToken, setSessionCookie } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', req.url));
  }

  try {
    const userId = await consumeMagicLinkToken(token);
    if (!userId) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', req.url));
    }

    const sessionToken = await createSessionToken({ userId, email: userRows[0].email });
    await setSessionCookie(sessionToken);

    return NextResponse.redirect(new URL('/account', req.url));
  } catch (err) {
    console.error('[Auth] verify error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', req.url));
  }
}
