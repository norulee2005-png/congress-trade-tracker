# Development Roadmap

**Last Updated:** 2026-03-31 | **Status:** Phase 1 in progress, phases 2–5 queued

## High-Level Vision

Congress Trade Tracker evolves from a basic trade database (Phase 1–2) to a comprehensive investment intelligence platform (Phase 3–4), with full documentation and testing in Phase 5–6.

```
Phase 1 (Database, Deploy)
    ↓
Phase 2 (Alerts, Retention Engine)
    ↓
Phase 3 (Data Enrichment — Korean Context)
    ↓
Phase 4 (Stock Prices, Profit Ranking)
    ↓
Phase 5 (Documentation)
    ↓
Phase 6 (Testing & QA)
```

## Phase Breakdown

### Phase 1: Database Migration & Deploy (IN PROGRESS)

**Goal:** Migrate from development to production. Full Vercel + Neon deployment.

**Status:** ~80% complete (code review passed, deployment pending)

| Component | Status | Effort |
|-----------|--------|--------|
| Neon DB migration | Complete | S |
| Vercel setup | Complete | S |
| Schema finalization | Complete | S |
| Trade scraper fixes | Complete | S |
| Environmental configs | Complete | S |
| Initial data load | Pending | S |
| Go-live verification | Pending | S |

**Success Criteria:**
- [ ] Homepage loads in < 2s
- [ ] Politician pages render (all 537 members)
- [ ] Search returns results within 1s
- [ ] Scraper cron executes without errors
- [ ] No 500 errors in production logs
- [ ] Database health check passes

**Dependencies:** None (critical path)

**Estimated Completion:** 2026-04-05

---

### Phase 2: Alerts & KakaoTalk Sharing (PENDING)

**Goal:** Retention engine. Notify users of trades matching their interests; enable sharing to KakaoTalk.

**Status:** 0% (awaiting Phase 1)

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Alert UI (create/edit/delete) | Pending | M | React form + validation |
| Alert processor (condition matching) | Code exists | S | Test with live trades |
| Email notifications | Pending | S | Integrate Resend |
| KakaoTalk webhook integration | Pending | M | External SDK integration |
| Alert analytics (click-through, engagement) | Pending | S | Track user interactions |
| Alert frequency options (immediate/daily/weekly) | Pending | S | Batch logic |

**Success Criteria:**
- [ ] Users can create alerts on politician + stock + trade type
- [ ] Emails send within 5 minutes of trade scrape
- [ ] KakaoTalk share button works (tests with dev account)
- [ ] Unsubscribe links respect user preferences
- [ ] Alert opt-in rate > 5% (initial goal)

**Dependencies:** Phase 1 (live database required)

**Estimated Completion:** 2026-04-19

---

### Phase 3: Data Enrichment — Korean Names, Photos, Sectors (PENDING)

**Goal:** Enrich politician and stock data for Korean audience. Add photos, Korean names, sector classifications.

**Status:** 0% (awaiting Phase 1)

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Politician photo scraping | Pending | M | Congress.gov or external API |
| Korean name mapping | Pending | M | Manual CSV + Wikipedia API |
| Stock sector/industry tagging | Pending | M | FMP API or manual |
| Photo CDN integration | Pending | S | Vercel Image Optimization |
| Data validation + QA | Pending | L | Ensure accuracy |

**Success Criteria:**
- [ ] 100% of active politicians have photos
- [ ] 80%+ of politicians have Korean names
- [ ] All stocks in top 100 trades have sector tags
- [ ] Image load time < 500ms (optimized)
- [ ] No broken image links

**Dependencies:** Phase 1, Phase 2 (can start data collection in parallel)

**Estimated Completion:** 2026-05-03

---

### Phase 4: Stock Price Tracking & Profit Rankings (PENDING)

**Goal:** Add real-time stock prices and calculate profit estimates for buy→sell trades.

**Status:** 0% (awaiting Phase 1)

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Stock price API integration (FMP) | Pending | M | $10–20/mo budget approved |
| Price update cron (hourly) | Pending | S | Vercel cron |
| Profit calculation engine | Pending | M | Match buy trades → sell trades by politician |
| Profit ranking page | Pending | L | Complex sorting, filtering, analytics |
| Price chart visualization | Pending | M | Chart library (TBD) |
| Legal disclaimers | Pending | S | Risk warnings on estimates |

**Success Criteria:**
- [ ] Stock prices update within 1 hour of market close
- [ ] Profit rankings calculated for 100%+ of pairs
- [ ] Profit page loads in < 3s
- [ ] Profit estimates clearly labeled "estimates only"
- [ ] Price accuracy verified against Yahoo Finance
- [ ] No legal liability (disclaimers visible)

**Dependencies:** Phase 1, Phase 3 (optional but preferred for context)

**Estimated Completion:** 2026-06-07

---

### Phase 5: Documentation Init (IN PROGRESS)

**Goal:** Complete developer documentation, API reference, and deployment guides.

**Status:** ~30% (this document being created)

| Component | Status | Effort |
|-----------|--------|--------|
| Project overview & PDR | Complete | S |
| Code standards | Complete | S |
| Codebase summary | Complete | S |
| System architecture | Complete | S |
| Deployment guide | Complete | S |
| Development roadmap | In Progress | S |
| API reference | Pending | M |
| GitHub README | Pending | S |
| Troubleshooting guide | Pending | S |

**Success Criteria:**
- [ ] All docs under 200 LOC (modular)
- [ ] No broken links between docs
- [ ] Code examples are runnable
- [ ] Deployment guide tested end-to-end
- [ ] README has quick start + feature list

**Dependencies:** Phase 1 (for deployment instructions)

**Estimated Completion:** 2026-04-07

---

### Phase 6: Testing & QA (PENDING)

**Goal:** Comprehensive test coverage, performance benchmarks, and QA validation.

**Status:** 0% (after Phase 1–4)

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Unit tests (services) | Pending | M | Jest, 80%+ coverage |
| Integration tests (API) | Pending | M | Real DB, test fixtures |
| E2E tests (critical flows) | Pending | L | Playwright (login, search, alert creation) |
| Performance benchmarks | Pending | S | Load testing (1K concurrent) |
| Security audit | Pending | M | OWASP top 10, SQL injection, XSS |
| Accessibility audit | Pending | S | WCAG 2.1 AA compliance |

**Success Criteria:**
- [ ] 80%+ line coverage on src/
- [ ] All critical user flows have E2E tests
- [ ] Page load time < 2s (p95)
- [ ] Zero high-severity security issues
- [ ] WCAG AA compliance score > 95

**Dependencies:** All earlier phases complete

**Estimated Completion:** 2026-07-05

---

## Cross-Phase Initiatives

### Performance & Scalability (Ongoing)

| Initiative | Status | Target |
|-----------|--------|--------|
| ISR caching optimization | In Progress | Revalidate every 3600s |
| Database query optimization | In Progress | < 100ms per query (p95) |
| Image optimization | Pending Phase 3 | < 500ms load time |
| Monitoring & alerting | Pending Phase 5 | Error rate < 0.1% |

### Security & Compliance (Ongoing)

| Initiative | Status | Target |
|-----------|--------|--------|
| Rate limiting | Planned Phase 1 | 10 req/s per IP |
| Input validation | Complete | 100% user inputs sanitized |
| XSS protection | Complete | Blog HTML sanitized |
| CSRF protection | Complete | Built-in Next.js |
| GDPR compliance | In Progress | Consent forms, data export |

### User Research & Feedback (Ongoing)

| Initiative | Status | Target |
|-----------|--------|--------|
| Organic user acquisition | Phase 1 | 500+ weekly active by Q2 |
| Feature feedback | Phase 2+ | Alert satisfaction > 8/10 |
| Korean audience validation | Phase 3 | Engagement metrics improve |
| Retention metrics | Phase 4+ | 30-day retention > 20% |

---

## Timeline Summary

| Phase | Start Date | End Date | Duration | Status |
|-------|------------|----------|----------|--------|
| 1 | 2026-03-31 | 2026-04-05 | 5 days | 80% |
| 2 | 2026-04-06 | 2026-04-19 | 14 days | Queued |
| 3 | 2026-04-20 | 2026-05-03 | 14 days | Queued |
| 4 | 2026-05-04 | 2026-06-07 | 35 days | Queued |
| 5 | 2026-03-31 | 2026-04-07 | 7 days | 30% |
| 6 | 2026-06-08 | 2026-07-05 | 28 days | Queued |

**Overall Timeline:** Phase 1 launch by 2026-04-05. Full feature set by 2026-07-05.

---

## Budget & Resource Allocation

| Item | Cost/Month | Notes |
|------|-----------|-------|
| Vercel Pro (if needed) | $20 | Free tier sufficient for MVP |
| Neon Postgres (upgraded) | $10 | Free tier: 3GB, sufficient |
| Stock Price API (FMP) | $15 | Approved for Phase 4 |
| Resend (upgraded) | $20 | Free tier: 100 emails/day, sufficient |
| Stripe | % revenue | Revenue-based only |
| **Total** | **~$65/mo** | Fully bootstrapped with free tiers |

---

## Known Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Scraper breaks (Congress.gov redesign) | High | Maintain fallback HTML parser, test weekly |
| Neon downtime | High | Enable auto-backups, test restore process |
| Stripe webhook delays | Medium | Implement retry logic, monitor in Datadog |
| Korean translation quality | Medium | Hire native reviewer for Phase 3 |
| Stock price API rate limits | Low | Buffer requests, implement caching |

---

**Next Review:** 2026-04-05 (after Phase 1 launch)

**Owner:** Engineering Team | **Last Updated:** 2026-03-31
