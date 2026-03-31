/**
 * Database seed script - populates initial politicians and runs historical data scrape.
 * Usage: npx tsx scripts/seed.ts
 */
import 'dotenv/config';
import { db } from '../src/db/db-client';
import { politicians } from '../src/db/schema';
import { POLITICIAN_SEEDS } from '../src/lib/seed-politicians';
import { runSenatePipeline, runHousePipeline } from '../src/lib/trade-pipeline';

async function seedPoliticians() {
  console.log('[Seed] Inserting known politicians...');
  for (const p of POLITICIAN_SEEDS) {
    await db
      .insert(politicians)
      .values({
        bioguideId: p.bioguideId,
        firstName: p.firstName,
        lastName: p.lastName,
        nameEn: p.nameEn,
        nameKr: p.nameKr,
        party: p.party,
        chamber: p.chamber,
        state: p.state,
        district: p.district,
        slug: p.slug,
        isActive: true,
      })
      .onConflictDoNothing();
  }
  console.log(`[Seed] ${POLITICIAN_SEEDS.length} politicians seeded`);
}

async function seedHistoricalTrades() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 1; // 12+ months of history

  // Senate: fetch past 12 months via date range
  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  await runSenatePipeline(fmt(twelveMonthsAgo), fmt(today));

  // House: fetch full year index for current and prior year
  await runHousePipeline(startYear);
  await runHousePipeline(currentYear);
}

async function main() {
  try {
    console.log('[Seed] Starting database seed...');
    await seedPoliticians();
    await seedHistoricalTrades();
    console.log('[Seed] Complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Fatal error:', err);
    process.exit(1);
  }
}

main();
