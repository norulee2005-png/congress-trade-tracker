# Project Overview & Product Requirements

**Project:** Congress Trade Tracker v2  
**Status:** Phase 1–4 in development; Phase 5 (docs) active  
**Target Audience:** Korean investors researching US Congress member stock trades  
**Language:** Korean-first UI with English fallback

## Overview

Congress Trade Tracker is a public database of US Congress member stock trades disclosed under the STOCK Act. Users search trades by politician, stock, or date range and see ranking dashboards. Phase 2 adds alert notifications; Phase 4 adds profit estimates.

## Core Features

| Feature | Status | Phase |
|---------|--------|-------|
| Trade scraping (House/Senate filings) | Complete | Phase 1 |
| Politician profiles | Complete | Phase 2 |
| Stock pages with prices | Planned | Phase 4 |
| Alert notifications + KakaoTalk sharing | Planned | Phase 2 |
| Korean names & photos for politicians | Planned | Phase 3 |
| Profit rankings (buy→sell tracking) | Planned | Phase 4 |
| Blog/education content | Complete | Phase 2 |

## Non-Functional Requirements

- **Performance:** ISR caching (revalidate every 3600s). Page load < 2s.
- **Availability:** 99.5% uptime (Vercel + Neon Postgres).
- **Scalability:** Support 10K daily active users. ~500 new trades/week ingestion.
- **Security:** HTTPS, rate limiting (10 req/s per IP), input validation, XSS/CSRF protection.
- **Compliance:** GDPR-ready (collect emails only for alerts). No PII storage beyond politician names.

## Key Constraints

1. **Budget:** $10–20/month for stock price API (FMP or similar). All other infra on free tiers.
2. **Deployment:** Vercel (10s function timeout, 100GB bandwidth limit).
3. **Database:** Neon Postgres (free tier: 3GB storage, shared compute).
4. **Scrapers:** House.gov / Senate.gov filings (no API — HTTP scraping via Cheerio).
5. **Disclaimer:** Profit estimates labeled as "estimates only" with risk disclaimers.

## Success Metrics

- 500+ weekly active users by Q2 2026
- Alert opt-in rate > 10%
- Average session duration > 3 minutes
- Zero unplanned downtime

## Technical Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Vercel cron
- **Database:** PostgreSQL (Neon), Drizzle ORM
- **Payments:** Stripe (revenue-based fees)
- **Email:** Resend (100 free emails/day)
- **Auth:** Magic links (email-only, JWT sessions)
- **Monitoring:** Structured logging, pipeline health checks

## Roadmap

1. **Phase 1:** DB migration, Vercel deployment — *In Progress*
2. **Phase 2:** Alerts + KakaoTalk sharing — *Pending*
3. **Phase 3:** Korean names, politician photos, sector data — *Pending*
4. **Phase 4:** Stock price tracking, profit rankings — *Pending*
5. **Phase 5:** Documentation, GitHub README, API docs — *In Progress*

---

**Last Updated:** 2026-03-31 | **Owner:** Engineering Team
