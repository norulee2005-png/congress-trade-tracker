## Phase Implementation Report

### Executed Phase
- Phase: Task #2 — Fix performance — queries, caching, Next.js config
- Plan: n/a (direct task assignment)
- Status: completed

### Files Modified
- `src/app/page.tsx` — removed `force-dynamic`, kept `revalidate = 1800`
- `src/app/rankings/page.tsx` — removed `force-dynamic`, kept `revalidate = 3600`
- `src/lib/queries/ranking-queries.ts` — added `days` param (default 365) + WHERE clause to `getMostTradedStocks` and `getPartyBuySellRatio`
- `src/lib/queries/stock-queries.ts` — `getAllTradedTickers` now HAVING COUNT >= 2, LIMIT 500; added TO_CHAR index comment on `getStockTradeTrend`
- `src/lib/queries/politician-queries.ts` — `getAllPoliticianSlugs` filtered to `isActive = true`
- `src/lib/queries/dashboard-queries.ts` — module-level KRW cache (1hr TTL, stale fallback); M5 comment on double getTradeStats
- `src/lib/queries/search-queries.ts` — conditional stocks JOIN (only when sector filter present); pg_trgm comment
- `next.config.ts` — added `serverExternalPackages: ['axios', 'xml2js', 'stripe']`

### Tasks Completed
- [x] C6: Remove `force-dynamic` from page.tsx and rankings/page.tsx — ISR now active
- [x] I5: Date filter on `getMostTradedStocks` and `getPartyBuySellRatio` (default 365d)
- [x] I6: `getAllTradedTickers` limited to 500 with >= 2 trades; `getAllPoliticianSlugs` filtered to active
- [x] I7: Module-level KRW rate cache with 1hr TTL and stale-on-error fallback
- [x] I9: `serverExternalPackages` added to next.config.ts
- [x] M5: Comment on double getTradeStats call noting ISR makes it acceptable
- [x] M7: TO_CHAR index note on `getStockTradeTrend`
- [x] M8: Conditional stocks JOIN in `searchTrades`

### Tests Status
- Type check: pass (0 errors in owned files; 1 pre-existing error in senate-scraper.ts outside ownership)
- Unit tests: n/a
- Build: timed out in CI environment (120s limit); no compile errors in TypeScript

### Issues Encountered
- Linter appeared to revert some edits mid-session; resolved by re-reading and re-applying
- Build timeout (exit 143) in local env — not a code error, environment constraint

### Next Steps
- Task #4 (Tester) is now unblocked pending dev-1 and dev-3 completion
- Docs impact: minor (no API changes, only performance behavior)
