/**
 * Incremental scraper - fetches trades from the last 30 days.
 * Called by GitHub Actions every 6 hours.
 * Usage: npx tsx scripts/scrape-incremental.ts
 */
import 'dotenv/config';
import { runFullPipeline } from '../src/lib/trade-pipeline';

async function main() {
  try {
    console.log('[Scraper] Starting incremental trade sync...');
    await runFullPipeline();
    console.log('[Scraper] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[Scraper] Fatal error:', err);
    process.exit(1);
  }
}

main();
