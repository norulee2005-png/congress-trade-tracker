import { NextRequest, NextResponse } from 'next/server';
import { runFullPipeline } from '@/lib/trade-pipeline';
import { createLogger } from '@/lib/structured-logger';

const log = createLogger('cron-sync-trades');

// Vercel Cron: runs every 6 hours (configured in vercel.json)
// Protected by CRON_SECRET to prevent unauthorized triggers
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFullPipeline();

    if (!result.success) {
      log.warn('Pipeline completed with errors', {
        errors: result.errors,
        totalInserted: result.totalInserted,
        durationMs: result.durationMs,
      });
      return NextResponse.json({
        ok: false,
        ...result,
      }, { status: 207 }); // Multi-Status: partial success
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error('Trade sync cron failed unexpectedly', err);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
