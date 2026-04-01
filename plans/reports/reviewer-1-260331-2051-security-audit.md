# Security Audit Report — congress-trade-tracker

**Reviewer:** reviewer-1
**Date:** 2026-03-31
**Branch:** main

---

## Scope

Files reviewed:
- `src/lib/auth-session.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/magic-link-service.ts`
- `src/app/api/auth/send-magic-link/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/alerts/route.ts`
- `src/app/api/alerts/[id]/route.ts`
- `src/lib/queries/search-queries.ts`
- `src/lib/blog-posts.ts`
- `src/app/blog/[slug]/page.tsx`
- `src/lib/senate-scraper.ts`
- `src/lib/house-scraper.ts`
- `src/lib/alert-processor.ts`
- `.env.example`

---

## Findings

### [CRITICAL] XSS via unsanitized blog HTML rendering

- **Evidence:** `src/lib/blog-posts.ts:58` — `remark().use(html, { sanitize: false })`. The resulting `contentHtml` is injected verbatim into the DOM at `src/app/blog/[slug]/page.tsx:121` via `dangerouslySetInnerHTML={{ __html: post.contentHtml }}`.
- **Impact:** Any `<script>` tag or inline event handler embedded in a blog Markdown file is executed in the reader's browser. If an attacker can write or inject a blog post (e.g., via a compromised deployment, path traversal, or future CMS), they achieve stored XSS with full session/cookie access.
- **Recommendation:** Enable sanitization by changing to `remark().use(html, { sanitize: true })`, or replace `remark-html` with `rehype-sanitize` (the actively-maintained successor). Alternatively, use `remark` + `rehype` pipeline with `rehype-sanitize` using a strict allowlist schema.

---

### [CRITICAL] SSRF via unvalidated Discord webhook URL

- **Evidence:** `src/app/api/alerts/route.ts:42-44` — the server only checks `typeof channelConfig.webhookUrl !== 'string'`; no URL format or domain validation is performed. `src/lib/alert-processor.ts:84` — the stored URL is fetched server-side with `fetch(webhookUrl, ...)` during alert dispatch.
- **Impact:** A Pro-tier user can supply any arbitrary URL (e.g., `http://169.254.169.254/latest/meta-data/` on AWS, internal services, or attacker-controlled endpoints). The server will make an outbound HTTP POST to that URL, enabling SSRF attacks against internal infrastructure or metadata services.
- **Recommendation:** Validate that the webhook URL matches `https://discord.com/api/webhooks/` prefix before storing. Example: `if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) return 400`.

---

### [IMPORTANT] No rate limiting on magic link endpoint

- **Evidence:** `src/app/api/auth/send-magic-link/route.ts:4-21` — no rate limiting, no per-email cooldown, no global request throttle. Email validation is only `!email.includes('@')`.
- **Impact:** An attacker can spam the endpoint to exhaust the Resend free-tier quota (100 emails/day), enumerate valid accounts via timing differences, or trigger Resend account suspension. Also, the weak email validation (`includes('@')`) accepts inputs like `@` or `a@` which will cause Resend API errors.
- **Recommendation:** Add per-email cooldown (e.g., 60s between requests) using an in-memory cache or Redis. Use a proper email regex or a validation library. Consider adding CAPTCHA for unauthenticated endpoints.

---

### [IMPORTANT] JWT session has no revocation mechanism

- **Evidence:** `src/lib/auth-session.ts:27-34` — `verifySessionToken` only validates the JWT signature and expiry (30-day window). No server-side session store, no revocation list.
- **Impact:** A stolen session token remains valid for up to 30 days with no way to invalidate it short of rotating `JWT_SECRET` (which would log out all users). Logout (`clearSessionCookie`) only deletes the client cookie; the JWT remains valid if captured.
- **Recommendation:** Either shorten expiry significantly (e.g., 7 days or 24h with refresh tokens), or maintain a server-side session table keyed by JWT `jti` claim with the ability to revoke individual sessions.

---

### [IMPORTANT] Magic link token not deleted on consumption (only marked used)

- **Evidence:** `src/lib/magic-link-service.ts:38` — `consumeMagicLinkToken` sets `usedAt` but does NOT delete the row. Combined with the `isNull(magicLinks.usedAt)` check this prevents reuse, but old tokens accumulate in the DB indefinitely with no cleanup job.
- **Impact:** Not a direct exploit (reuse is blocked), but the tokens table grows unboundedly and historical tokens (plaintext 96-char hex) are exposed if the database is compromised. There's no evidence of a cleanup/pruning task.
- **Recommendation:** Either DELETE the row after consumption, or add a scheduled job to purge tokens where `expiresAt < now() - interval '7 days'`.

---

### [IMPORTANT] Health endpoint exposes internal DB metrics without auth

- **Evidence:** `src/app/api/health/pipeline/route.ts:9-11` — documented as "No auth required (returns aggregate stats only, no PII)". The endpoint returns `totalTrades` count, `lastInsertedAt`, and `hoursSinceLastInsert`.
- **Impact:** While no PII is exposed, the data freshness metrics reveal operational details (pipeline cadence, data volume) useful for competitive intelligence or timing attacks. Returning error details (`err.message`) at line 57 can leak internal infrastructure details on DB failure.
- **Recommendation:** Suppress raw `err.message` from the 500 response. Consider adding optional `CRON_SECRET` gating to the health endpoint, or only expose it to Vercel's monitoring infrastructure.

---

### [MODERATE] Insufficient email validation allows malformed input to reach Resend

- **Evidence:** `src/app/api/auth/send-magic-link/route.ts:7` — validation is `!email.includes('@')`. Inputs like `@bad`, `user@`, `a@b` pass.
- **Impact:** Malformed emails will reach the Resend API causing unnecessary errors and potential abuse of the email quota.
- **Recommendation:** Use a proper RFC 5322 regex or a library like `validator.js` (`isEmail()`).

---

### [MODERATE] No Content Security Policy (CSP) headers

- **Evidence:** `next.config.ts` — empty config, no `headers()` function. No CSP, `X-Frame-Options`, or `X-Content-Type-Options` headers set.
- **Impact:** Increases XSS exploitability if the blog sanitization issue above is exploited, and leaves clickjacking vectors open.
- **Recommendation:** Add security headers in `next.config.ts` via the `headers()` export. At minimum: `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

### [MODERATE] JSON-LD `dangerouslySetInnerHTML` with DB-sourced data

- **Evidence:** Multiple pages (`src/app/politicians/[slug]/page.tsx:107`, `src/app/stocks/[ticker]/page.tsx:109`, etc.) inject `JSON.stringify(jsonLd)` via `dangerouslySetInnerHTML`. The `jsonLd` objects include DB fields like politician names and stock tickers.
- **Impact:** `JSON.stringify` provides some protection against XSS, but a value containing `</script>` (e.g., a politician name stored as `Nancy </script><script>alert(1)`) would break out of the script tag. This is unlikely with current data sources but possible if input sanitization upstream is weak.
- **Recommendation:** Replace `</script>` in the stringified output: `JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>')`.

---

### [MODERATE] Discord webhook URL stored in plaintext in DB

- **Evidence:** `src/db/schema/alerts.ts:11` — `channelConfig: text('channel_config')` stores raw JSON including the Discord webhook URL.
- **Impact:** A database compromise exposes all user Discord webhook URLs, which can be used to spam Discord channels.
- **Recommendation:** Consider encrypting the `channelConfig` field at the application layer, or at minimum document this as a known risk.

---

## Positive Observations

- Stripe webhook signature validation is correctly implemented using `stripe.webhooks.constructEvent` with raw body (`req.text()`).
- Magic link tokens use `crypto.randomBytes(48)` — cryptographically secure.
- Magic link reuse prevention is correct: `isNull(magicLinks.usedAt)` combined with `gt(expiresAt, now)`.
- Session cookies have `httpOnly: true`, `secure` in production, `sameSite: 'lax'` — all correct.
- All alert API routes verify session before acting; DELETE scopes to `session.userId` preventing IDOR.
- Drizzle ORM parameterizes all queries; no raw SQL interpolation found in query files.
- `CRON_SECRET` is validated on cron endpoints via Bearer token check.
- Scrapers use a descriptive `User-Agent` header and include polite rate limiting (`sleep()`).

---

## Unresolved Questions

1. Are blog Markdown files exclusively authored by the development team, or is there any path where external content could be written to `src/content/blog/`? This affects the exploitability of the XSS finding.
2. Is there a CAPTCHA or bot-protection layer (e.g., Cloudflare Turnstile) in front of the magic link endpoint at the infrastructure level, even if not visible in the codebase?
3. Is the Neon database connection using SSL (`sslmode=require` shown in `.env.example`) enforced in the Drizzle client config? Should verify `src/db/db-client.ts`.
