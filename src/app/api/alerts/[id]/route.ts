import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/db-client';
import { alerts } from '@/db/schema';
import { getSession } from '@/lib/auth-session';

// DELETE /api/alerts/:id — soft-delete (deactivate) an alert
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;

  const result = await db
    .update(alerts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(alerts.id, id), eq(alerts.userId, session.userId)))
    .returning({ id: alerts.id });

  if (result.length === 0) {
    return NextResponse.json({ error: '알림을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
