import crypto from 'crypto';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { users, magicLinks } from '@/db/schema';
import { getResend } from './resend-client';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'no-reply@congresstrade.kr';

// Find or create user by email, return userId
export async function findOrCreateUser(email: string): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0].id;

  const created = await db.insert(users).values({ email }).returning({ id: users.id });
  return created[0].id;
}

// Create a one-time token stored in DB
export async function createMagicLinkToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(magicLinks).values({ userId, token, expiresAt });
  return token;
}

// Verify token and mark used — returns userId or null
export async function consumeMagicLinkToken(token: string): Promise<string | null> {
  const now = new Date();
  const rows = await db
    .select({ id: magicLinks.id, userId: magicLinks.userId })
    .from(magicLinks)
    .where(and(eq(magicLinks.token, token), gt(magicLinks.expiresAt, now), isNull(magicLinks.usedAt)))
    .limit(1);

  if (rows.length === 0) return null;

  await db.update(magicLinks).set({ usedAt: now }).where(eq(magicLinks.id, rows[0].id));
  return rows[0].userId;
}

// Send the magic link email in Korean
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const link = `${baseUrl}/api/auth/verify?token=${token}`;
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: '[의회 주식 추적기] 로그인 링크',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1d4ed8">의회 주식 추적기</h2>
        <p>아래 버튼을 클릭하여 로그인하세요. 링크는 <strong>${MAGIC_LINK_EXPIRY_MINUTES}분</strong> 동안 유효합니다.</p>
        <a href="${link}"
          style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1d4ed8;color:#fff;
                 border-radius:6px;text-decoration:none;font-weight:600">
          로그인하기
        </a>
        <p style="font-size:13px;color:#6b7280">
          이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af">
          의회 주식 추적기 · 미국 STOCK Act 공시 데이터 한국어 서비스
        </p>
      </div>`,
  });
}
