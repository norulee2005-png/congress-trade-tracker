# Phase 4: Stock Price Tracking & Profit Rankings

**Priority:** High | **Effort:** L | **Blocked by:** Phase 1, Phase 3
**Budget:** $14/mo for Financial Modeling Prep API (CEO review approved)

## Overview

Track stock prices, calculate post-trade returns, add profit-based rankings. Label all return data as **estimates** with prominent disclaimers (CEO review: both reviewers flagged credibility risk).

## Steps

### 4.1 Schema additions
- Add to `trades`: `priceAtDisclosure: numeric('price_at_disclosure', { precision: 12, scale: 4 })`
- `stocks.currentPrice` and `stocks.priceUpdatedAt` already exist

### 4.2 Price fetcher service
- Create `src/lib/stock-price-fetcher.ts`
- Primary: FMP API `/api/v3/quote/{ticker}` (paid, reliable)
- Batch: up to 50 tickers per request
- Fallback: Yahoo Finance v8 (free, unreliable)
- Cache: module-level + DB (`stocks.currentPrice`)

### 4.3 Integrate into cron pipeline
- After trade sync, fetch prices for tickers with trades in last 30d
- Update `stocks.currentPrice` + `stocks.priceUpdatedAt`
- Backfill `priceAtDisclosure` for new trades (use current price as approximation)

### 4.4 Return calculation queries
- Create `src/lib/queries/return-queries.ts`:
  - `getTradeReturns(politicianId)` — per-trade return %
  - `getPoliticianAvgReturn(politicianId, days)` — weighted avg
  - `getTopReturnPoliticians(days, limit)` — profit rankings

### 4.5 Profit rankings UI
- `src/app/rankings/page.tsx` — new section: "수익률 TOP 10 의원 (추정)"
  - Period toggle: 30d / 90d / 180d / 365d
  - Show: name (KR), party, avg return %, trade count
  - **Prominent disclaimer:** "수익률은 공시일 기준 추정치이며, 실제 수익률과 다를 수 있습니다"

### 4.6 Enhanced OG images
- Update `src/app/api/og/top5/route.tsx` — include return % in card
- Update `src/app/api/og/politician/[slug]/route.tsx` — show estimated return

### 4.7 UI integration
- Politician profile: return % per trade in history table
- Stock page: price change since most recent congress trade

## Success Criteria
- [ ] Stock prices update on each cron run via FMP API
- [ ] Each trade shows estimated return %
- [ ] Rankings page shows profit-based TOP 10
- [ ] All return data labeled as estimates
- [ ] OG images include return data
