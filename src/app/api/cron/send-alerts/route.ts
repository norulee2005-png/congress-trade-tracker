import { NextRequest, NextResponse } from 'next/server';
import { processAlerts } from '@/lib/alert-processor';

// Vercel Cron: runs every 6 hours aligned with trade sync (see vercel.json)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process alerts for trades disclosed in the last 7 hours (slight overlap to avoid gaps)
    const since = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const result = await processAlerts(since);
    return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Cron] send-alerts failed:', err);
    return NextResponse.json({ error: 'Alert processing failed' }, { status: 500 });
  }
}
