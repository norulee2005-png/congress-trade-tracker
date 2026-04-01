/**
 * Enrichment script - fetches bioguide IDs, photo URLs, and updates politician records.
 * Queries Congress.gov Bioguide API (no API key required).
 * Usage: npx tsx scripts/enrich-politicians.ts
 */
import 'dotenv/config';
import { db } from '../src/db/db-client';
import { politicians } from '../src/db/schema';
import { isNull, eq } from 'drizzle-orm';
import koreanNames from '../src/data/politician-names-kr.json';

const BIOGUIDE_SEARCH_URL = 'https://bioguide.congress.gov/search/bio/';
const BIOGUIDE_PHOTO_URL = 'https://bioguide.congress.gov/bioguide/photo';
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[Enrich] HTTP ${res.status} on attempt ${attempt}/${retries}: ${url}`);
        if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return res; // 4xx non-429 — return as-is, caller handles
    } catch (err) {
      console.warn(`[Enrich] Network error on attempt ${attempt}/${retries}:`, err);
      if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`[Enrich] All ${retries} retries failed for ${url}`);
}

interface BioguideResult {
  usCongressBioId: string;
  firstName: string;
  lastName: string;
  party?: string;
  stateName?: string;
  stateCode?: string;
  congressAffiliation?: Array<{
    congress: { congressNumber: number };
    partyAffiliation?: Array<{ party: { partyName: string } }>;
    stateCode?: string;
  }>;
}

async function searchBioguide(firstName: string, lastName: string): Promise<BioguideResult | null> {
  const params = new URLSearchParams({
    congressNumber: '118',
    lastName,
    firstName,
  });
  const url = `${BIOGUIDE_SEARCH_URL}?${params}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`[Enrich] Bioguide search failed for ${firstName} ${lastName}: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    // Response shape: { results: [...] }
    const results: BioguideResult[] = data?.results ?? [];
    if (results.length === 0) return null;
    // Best match: exact last name, first name
    return results.find(
      (r) =>
        r.lastName.toLowerCase() === lastName.toLowerCase() &&
        r.firstName.toLowerCase().startsWith(firstName.toLowerCase().split(' ')[0]),
    ) ?? results[0];
  } catch (err) {
    console.warn(`[Enrich] Error searching bioguide for ${firstName} ${lastName}:`, err);
    return null;
  }
}

function buildPhotoUrl(bioguideId: string): string {
  // Standard photo URL pattern from Congress.gov
  const firstLetter = bioguideId[0].toUpperCase();
  return `${BIOGUIDE_PHOTO_URL}/${firstLetter}/${bioguideId}.jpg`;
}

function getKoreanName(slug: string): string | undefined {
  return (koreanNames as Record<string, string>)[slug] ?? undefined;
}

async function enrichPoliticians() {
  console.log('[Enrich] Fetching politicians with null bioguideId...');
  const targets = await db
    .select()
    .from(politicians)
    .where(isNull(politicians.bioguideId));

  if (targets.length === 0) {
    console.log('[Enrich] No politicians need enrichment.');
    return;
  }

  console.log(`[Enrich] Found ${targets.length} politicians to enrich.`);

  let enriched = 0;
  let failed = 0;

  for (const politician of targets) {
    console.log(`[Enrich] Processing: ${politician.nameEn}`);

    const bioguideResult = await searchBioguide(politician.firstName, politician.lastName);

    if (!bioguideResult) {
      console.warn(`[Enrich] No bioguide match for ${politician.nameEn}`);
      failed++;
      await sleep(300); // polite delay even on miss
      continue;
    }

    const bioguideId = bioguideResult.usCongressBioId;
    const photoUrl = buildPhotoUrl(bioguideId);

    // Extract party from affiliations if missing
    const latestAffiliation = bioguideResult.congressAffiliation?.[0];
    const partyFromApi = latestAffiliation?.partyAffiliation?.[0]?.party?.partyName;
    const stateFromApi = latestAffiliation?.stateCode;

    const nameKr = getKoreanName(politician.slug) ?? politician.nameKr ?? undefined;

    await db
      .update(politicians)
      .set({
        bioguideId,
        photoUrl,
        ...(partyFromApi && !politician.party ? { party: partyFromApi } : {}),
        ...(stateFromApi && !politician.state ? { state: stateFromApi } : {}),
        ...(nameKr ? { nameKr } : {}),
        updatedAt: new Date(),
      })
      .where(eq(politicians.id, politician.id));

    console.log(`[Enrich] Updated ${politician.nameEn} -> bioguideId: ${bioguideId}`);
    enriched++;

    // Polite delay between API calls
    await sleep(500);
  }

  console.log(`[Enrich] Complete. Enriched: ${enriched}, Failed: ${failed}`);
}

async function main() {
  try {
    await enrichPoliticians();
    process.exit(0);
  } catch (err) {
    console.error('[Enrich] Fatal error:', err);
    process.exit(1);
  }
}

main();
