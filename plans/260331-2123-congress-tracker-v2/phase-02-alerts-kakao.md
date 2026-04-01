# Phase 2: Alerts & KakaoTalk Sharing (Retention Engine)

**Priority:** High | **Effort:** M | **Blocked by:** Phase 1
**CEO rationale:** Both reviewers flagged alerts as the core retention mechanism. Elevated from Phase 4.

## Overview

Make the existing alert system the hero feature. Add KakaoTalk sharing (the distribution channel Korean investors actually use). This is the retention engine.

## Steps

### 2.1 KakaoTalk Share Button
- Register Kakao App at developers.kakao.com (free)
- Add `NEXT_PUBLIC_KAKAO_APP_KEY` to `.env.example` and `.env.local`
- Add Kakao JS SDK via `next/script` in `src/app/layout.tsx`
- Extend `src/components/sns-share-buttons.tsx` with KakaoTalk button
  - Use `Kakao.Share.sendDefault()` with feed template
  - Include OG image, title, description in Korean
  - Fallback: `kakaotalk://` URL scheme on mobile

### 2.2 Enhanced Alert UX
- `src/components/alerts-manager.tsx` — add quick-add buttons for popular politicians/stocks
- `src/app/alerts/page.tsx` — improve onboarding copy explaining alert value
- Add "알림 설정" CTA prominently on politician and stock pages

### 2.3 KakaoTalk Alert Channel (stretch)
- Investigate Kakao Push API for direct KakaoTalk message alerts
- If feasible with free tier, add as alert channel alongside email/Discord
- If not, document as future enhancement

## Related Files
- MODIFY: `src/components/sns-share-buttons.tsx` — KakaoTalk button
- MODIFY: `src/app/layout.tsx` — Kakao SDK script tag
- MODIFY: `src/components/alerts-manager.tsx` — quick-add UX
- MODIFY: `src/app/alerts/page.tsx` — onboarding copy
- MODIFY: `src/app/politicians/[slug]/page.tsx` — alert CTA
- MODIFY: `src/app/stocks/[ticker]/page.tsx` — alert CTA

## Success Criteria
- [ ] KakaoTalk share works on mobile and desktop
- [ ] Alert setup is 2 clicks from any politician/stock page
- [ ] Share buttons: X, KakaoTalk, Naver all functional
