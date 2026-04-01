/**
 * Backfill photo URLs for politicians that already have bioguideId but missing photoUrl.
 * Usage: npx tsx scripts/backfill-photos.ts
 */
import 'dotenv/config';
import { db } from '../src/db/db-client';
import { politicians } from '../src/db/schema';
import { isNull, isNotNull, eq } from 'drizzle-orm';

const BIOGUIDE_PHOTO_URL = 'https://bioguide.congress.gov/bioguide/photo';

function buildPhotoUrl(bioguideId: string): string {
  const firstLetter = bioguideId[0].toUpperCase();
  return `${BIOGUIDE_PHOTO_URL}/${firstLetter}/${bioguideId}.jpg`;
}

async function main() {
  const targets = await db
    .select({ id: politicians.id, slug: politicians.slug, bioguideId: politicians.bioguideId })
    .from(politicians)
    .where(isNull(politicians.photoUrl));

  console.log(`[Backfill] ${targets.length} politicians need photos.`);

  let updated = 0;
  for (const p of targets) {
    if (!p.bioguideId) {
      console.warn(`[Backfill] ${p.slug} has no bioguideId — skipping`);
      continue;
    }
    const photoUrl = buildPhotoUrl(p.bioguideId);
    await db.update(politicians).set({ photoUrl }).where(eq(politicians.id, p.id));
    console.log(`[Backfill] ✓ ${p.slug} → ${photoUrl}`);
    updated++;
  }
  console.log(`[Backfill] Done — updated ${updated} politicians.`);
}

main().catch(console.error).finally(() => process.exit());
