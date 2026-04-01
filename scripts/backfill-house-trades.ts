/**
 * One-time backfill: scrapes House PTR filings for historical years.
 * Usage: npx tsx scripts/backfill-house-trades.ts [year1 year2 ...]
 * Default: 2024 2025
 * Called via GitHub Actions workflow_dispatch.
 */
import 'dotenv/config';
import { runHousePipeline } from '../src/lib/trade-pipeline';

async function main() {
  const args = process.argv.slice(2);
  const years = args.length > 0
    ? args.map(Number).filter(y => y >= 2014 && y <= 2099)
    : [2024, 2025];

  if (years.length === 0) {
    console.error('[Backfill] No valid years provided');
    process.exit(1);
  }

  console.log(`[Backfill] Starting House trade backfill for years: ${years.join(', ')}`);

  let totalInserted = 0;
  for (const year of years) {
    console.log(`[Backfill] Processing year ${year}...`);
    try {
      const inserted = await runHousePipeline(year);
      totalInserted += inserted;
      console.log(`[Backfill] Year ${year}: ${inserted} trades inserted`);
    } catch (err) {
      console.error(`[Backfill] Year ${year} failed:`, err);
    }
  }

  console.log(`[Backfill] Done. Total inserted: ${totalInserted}`);
  process.exit(0);
}

main();
