# Phase 3: Data Enrichment — Korean Names, Photos, Sectors

**Priority:** High | **Effort:** M | **Blocked by:** Phase 1
**Note:** Renumbered from original Phase 2.

## Overview

Populate empty columns: `politicians.nameKr`, `politicians.photoUrl`, `politicians.bioguideId`, `stocks.sector`, `stocks.industry`.

## Steps

### 3.1 Politician Korean names + photos
- Source: Congress.gov Bioguide API (free, no key)
- Photos: `https://bioguide.congress.gov/bioguide/photo/{bioguideId}.jpg`
- Create `scripts/enrich-politicians.ts`:
  1. Fetch politicians from DB where `bioguideId IS NULL`
  2. Search Congress.gov API by name + chamber
  3. Update: bioguideId, photoUrl, state, district, party
  4. Korean names: static JSON map `src/data/politician-names-kr.json`
     - Auto-generate initial transliterations for all 535 members
     - Manually curate top 100 (CEO review: automated transliteration produces errors)
  5. Batch UPDATE with Korean names

### 3.2 Stock sector/industry data
- Source: Financial Modeling Prep API ($14/mo budget approved by CEO review)
- Create `scripts/enrich-stocks.ts`:
  1. Fetch stocks where `sector IS NULL`
  2. FMP endpoint: `/api/v3/profile/{ticker}` — returns sector, industry
  3. Batch UPDATE

### 3.3 Update seed script
- Update `scripts/seed.ts` with Korean names and sectors for new installs

## Success Criteria
- [ ] 90%+ politicians have Korean names (top 100 manually verified)
- [ ] All politicians have photos
- [ ] 80%+ stocks have sector/industry
