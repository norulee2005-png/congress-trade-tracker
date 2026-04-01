# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5 - All application code, server and client components
- JavaScript (JSX/TSX) - React component syntax

**Secondary:**
- SQL - Database migrations and queries via Drizzle ORM

## Runtime

**Environment:**
- Node.js 22 (per workflow configuration in `.github/workflows/`)

**Package Manager:**
- npm 11+ (inferred from package-lock.json size and structure)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework (App Router, server components, API routes)
- React 19.2.4 - UI component library
- React DOM 19.2.4 - React rendering for web

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind
- @tailwindcss/typography 0.5.19 - Typography plugin for blog content

**Database:**
- Drizzle ORM 0.45.2 - Type-safe SQL ORM
- drizzle-kit 0.31.10 - Migration and schema management
- @neondatabase/serverless 1.0.2 - Neon PostgreSQL client (serverless)

**Content & Markdown:**
- remark 15.0.1 - Markdown parser
- remark-html 16.0.1 - Markdown to HTML renderer
- gray-matter 4.0.3 - Markdown frontmatter parser

**Utilities:**
- axios 1.14.0 - HTTP client (for scraping and API calls)
- cheerio 1.2.0 - jQuery-like syntax for DOM parsing
- xml2js 0.6.2 - XML to JSON parser
- pdf-parse 2.4.5 - PDF text extraction
- jose 6.2.2 - JWT signing and verification (ES256 compatible)
- @vercel/og 0.11.1 - Dynamic Open Graph image generation

**Payments:**
- stripe 21.0.1 - Stripe payment SDK (latest API version: 2026-03-25.dahlia)

**Email:**
- resend 6.10.0 - Email delivery service

**Dev Tools:**
- tsx 4.21.0 - TypeScript execution for Node scripts
- ESLint 9 - Code linting
- eslint-config-next 16.2.1 - Next.js ESLint configuration

## Key Dependencies

**Critical:**
- @neondatabase/serverless - Enables serverless PostgreSQL database access on Vercel/Edge Runtime
- drizzle-orm - Type-safe ORM ensures schema consistency across migrations and queries
- stripe - Payment processing for premium features
- resend - Email delivery for authentication and alerts

**Infrastructure:**
- axios - All external API calls (Senate eFDS, House FD, FMP stock prices, Yahoo Finance)
- xml2js - XML parsing for Senate and House financial disclosures
- jose - JWT token creation for magic link authentication
- pdf-parse - PDF text extraction for House PTR filings (requires pdftotext binary)

## Configuration

**Environment:**
- `.env.local` (production secrets - never committed)
- `.env.example` (template with required variables)
- Variables are loaded automatically by Next.js

**Key environment variables:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Session token signing key
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` - Stripe configuration
- `RESEND_API_KEY`, `FROM_EMAIL` - Email service configuration
- `FMP_API_KEY` - Financial Modeling Prep API key for stock prices
- `CRON_SECRET` - Secret for protecting Vercel cron endpoints
- `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL` - Public URLs for OG images and emails
- `NEXT_PUBLIC_KAKAO_APP_KEY` - Kakao social sharing SDK

**Build:**
- `tsconfig.json` - TypeScript compiler configuration with ES2017 target and bundler module resolution
- `next.config.ts - Server external packages: axios, xml2js, stripe
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `eslint.config.mjs` - ESLint 9 flat config (newer syntax)
- `drizzle.config.ts` - Drizzle migration configuration for PostgreSQL

## Platform Requirements

**Development:**
- Node.js 22+
- pdftotext binary (from poppler-utils package) - required for House PTR PDF parsing in `src/lib/house-pdf-scraper.ts`
- PostgreSQL 12+ compatible database (tested with Neon)

**Production:**
- Vercel (primary deployment target, indicated by `.vercel/`, `vercel.json`, GitHub Actions workflow)
- PostgreSQL database accessible via connection string
- Environment variables for all secrets (managed via Vercel dashboard)
- Vercel Cron Jobs for automated scripts (e.g., `src/app/api/cron/send-alerts/route.ts`)

**Recommended:** Neon PostgreSQL (free tier supports app scale, mentioned in `.env.example`)

---

*Stack analysis: 2026-04-01*
