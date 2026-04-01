/**
 * Enriches politicians table using the unitedstates/congress-legislators dataset.
 * Pre-requisite: run the following to download legislator data:
 *   curl -sL https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml -o /tmp/legislators-current.yaml
 *   curl -sL https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-historical.yaml -o /tmp/legislators-historical.yaml
 *   python3 -c "import yaml,json; c=yaml.safe_load(open('/tmp/legislators-current.yaml')); h=yaml.safe_load(open('/tmp/legislators-historical.yaml')); all=c+h; data=[{'bioguide':l['id']['bioguide'],'last':l['name']['last'].lower(),'first':l['name']['first'].lower(),'official':l['name'].get('official_full','').lower(),'party':(([t for t in l.get('terms',[]) if t.get('type')=='rep'] or l.get('terms',[]))[-1] if l.get('terms') else {}).get('party',''),'state':(([t for t in l.get('terms',[]) if t.get('type')=='rep'] or l.get('terms',[]))[-1] if l.get('terms') else {}).get('state','')} for l in all]; json.dump(data, open('/tmp/legislators.json','w'))"
 * Then run: npx tsx scripts/enrich-politicians-legislators.ts
 */
import 'dotenv/config';
import { db } from '../src/db/db-client';
import { politicians } from '../src/db/schema';
import { isNull, eq } from 'drizzle-orm';
import fs from 'fs';

/** Normalize a name for matching — strip middle initials, honorifics, suffixes */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|honorable|hon|mr|ms|mrs|dr)\b\.?/gi, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract simple first name (first token before any space) */
function simpleFirst(name: string): string {
  return name.split(' ')[0];
}

interface FlatLegislator {
  bioguide: string;
  last: string;
  first: string;
  official: string;
  party: string;
  state: string;
}

async function main() {
  const jsonPath = '/tmp/legislators.json';
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath} — run the pre-requisite curl+python3 commands first.`);
  }
  const allLegislators: FlatLegislator[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`[Enrich] Loaded ${allLegislators.length} legislators total.`);

  // Build lookup: normalized_last -> FlatLegislator[]
  const byLastName = new Map<string, FlatLegislator[]>();
  for (const leg of allLegislators) {
    const key = normalizeName(leg.last);
    if (!byLastName.has(key)) byLastName.set(key, []);
    byLastName.get(key)!.push(leg);
  }

  // Fetch politicians missing enrichment data
  const targets = await db.select().from(politicians).where(isNull(politicians.bioguideId));
  console.log(`[Enrich] ${targets.length} politicians need enrichment.`);

  let enriched = 0;
  let skipped = 0;

  for (const pol of targets) {
    const normLast = normalizeName(pol.lastName);
    const candidates = byLastName.get(normLast) ?? [];

    if (candidates.length === 0) {
      skipped++;
      continue;
    }

    // Match by first name prefix
    const normFirst = normalizeName(pol.firstName);
    const firstToken = simpleFirst(normFirst);

    let leg = candidates.find((c) =>
      c.first.startsWith(firstToken) || firstToken.startsWith(c.first)
    );

    if (!leg) {
      // Try official_full match
      const normPolFull = normalizeName(pol.nameEn ?? '');
      leg = candidates.find((c) => c.official && normalizeName(c.official) === normPolFull);
    }

    if (!leg) {
      skipped++;
      continue;
    }

    const bioguideId = leg.bioguide;
    const party = leg.party || null;
    const state = leg.state || null;
    const firstLetter = bioguideId[0].toUpperCase();
    const photoUrl = `https://bioguide.congress.gov/bioguide/photo/${firstLetter}/${bioguideId}.jpg`;

    try {
      await db
        .update(politicians)
        .set({
          bioguideId,
          photoUrl,
          ...(party && !pol.party ? { party } : {}),
          ...(state && !pol.state ? { state } : {}),
          updatedAt: new Date(),
        })
        .where(eq(politicians.id, pol.id));

      console.log(`[Enrich] ${pol.nameEn} -> ${bioguideId} | ${party ?? '?'} | ${state ?? '?'}`);
      enriched++;
    } catch (err: unknown) {
      // Unique constraint: bioguide_id already used by another row — skip
      // Drizzle wraps the DB error in err.cause; check both levels
      const isUniqueViolation = (e: unknown): boolean => {
        if (!e || typeof e !== 'object') return false;
        const obj = e as Record<string, unknown>;
        if (obj['code'] === '23505') return true;
        const msg = String(obj['message'] ?? '');
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) return true;
        return isUniqueViolation(obj['cause']);
      };
      if (isUniqueViolation(err)) {
        console.warn(`[Enrich] SKIP ${pol.nameEn} — bioguide_id ${bioguideId} already assigned`);
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`\n[Enrich] Done. Enriched: ${enriched} | Skipped (no match): ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Enrich] Fatal:', err);
  process.exit(1);
});
