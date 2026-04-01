# Congress Trade Tracker v2 — Feature Completion Plan

**Created:** 2026-03-31 | **Branch:** main | **Status:** Reviewed
**Autoplan:** CEO review complete. Eng review pending.

## Context

Code review found and fixed 35 issues (security, performance, data integrity). Now completing remaining features from 프로젝트 개요 and deploying.

## CEO Review Decisions

1. **Phase reorder accepted** — alerts/KakaoTalk elevated to Phase 2 (was Phase 4)
2. **Budget unlocked** — $10-20/mo for reliable stock price API (FMP or similar)
3. **Demand validation skipped** — building first, validating through organic traction

## Phase Overview (REVISED)

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [DB Migration & Deploy](phase-01-db-migration-deploy.md) | Critical | S | Pending |
| 2 | [Alerts & KakaoTalk Sharing](phase-02-alerts-kakao.md) | High | M | Pending |
| 3 | [Data Enrichment](phase-03-data-enrichment.md) | High | M | Pending |
| 4 | [Stock Price Tracking & Profit Rankings](phase-04-stock-prices-rankings.md) | High | L | Pending |
| 5 | [Documentation Init](phase-05-docs-init.md) | Medium | S | Pending |

## Dependencies (REVISED)

```
Phase 1 (deploy) → Phase 2 (alerts/KakaoTalk — retention engine)
                 → Phase 3 (data enrichment — Korean names, photos, sectors)
                 → Phase 4 (stock prices + profit rankings — needs paid API)
Phase 5 (docs) — independent
```

## Key Constraints

- $10-20/mo budget for stock price API (CEO review unlocked this)
- All other infra: free tiers only (Neon, Vercel, Resend)
- Korean-first UI — all new features must have Korean labels
- Vercel free tier: 10s function timeout, 100GB bandwidth
- Profit data labeled as estimates with prominent disclaimers

## Autoplan Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale |
|---|-------|----------|---------------|-----------|-----------|
| 1 | CEO | Sequential approach (A) | Mechanical | P5 explicit | Dependencies are real |
| 2 | CEO | SELECTIVE EXPANSION mode | Mechanical | P3 pragmatic | Feature enhancement |
| 3 | CEO | Reorder phases: alerts to P2 | User Challenge | User confirmed | Retention engine first |
| 4 | CEO | $10-20/mo API budget | User Challenge | User accepted | Data trust > zero cost |
| 5 | CEO | Skip demand validation | User Challenge | User denied | Build first approach |
| 6 | CEO | Skip Design review | Mechanical | P3 pragmatic | Usage limits, lower ROI |
