# Gap Analysis Document — v2 Update

Update the downloadable gap analysis into a new versioned file, `Nythic_AI_Platform_Gap_Analysis_v2.md`, adding two things the current version is missing: an inventory of what the platform already does, and the reasoning for why the listed gaps were deferred instead of patched into this release.

## New structure

**Part A — What the platform supports today**
- AI study tools: source-bound chapter chat with persistent history, language-aware (Kannada/English, bilingual mode for the English subject in Kannada medium), flashcards with diagrams, 15-question quizzes with server-side scoring and randomised answers, interactive mind maps, infographics, YouTube-style video lessons with timestamp seeking, PDF sources panel with signed URLs, Kannada-localised tool labels.
- Student experience: signup profile, Resend email verification, course purchase and subject-level access gating, single-device login, inactivity logout, profile and password flows, mobile-native layout.
- Payments: PhonePe exclusive, dual-path webhook + polling verification, coupons, time-limited discounts with countdown, branded PDF receipts, legal pages.
- Admin: mediums/subjects/chapters, courses and pricing, videos, coupons, students with full auth deletion, status-filtered Excel exports, emailed reports, role table with `has_role`.
- Platform: React/Vite/TS/Tailwind, backend with RLS, Cloudflare Worker tunnel for India access, Gemini for all AI, GA4/GTM/Meta at page-view level.

**Part B — Why these gaps were not patched in this release**
Seven reasons, stated plainly:
1. They are new capabilities, not defects in what shipped.
2. Analytics is a foundation others depend on — partial instrumentation produces data that must later be thrown away.
3. Pricing automation carries revenue and trust risk without guards, audit history and demand data.
4. This cycle prioritised stability (Kannada Unicode detection, edge-function auth, chat layout, Cloudflare tunnel, admin content creation) and a schema-level subsystem would have widened the blast radius.
5. Five new tables mean new RLS/grant surface that deserves its own reviewable release.
6. Production migrations are applied manually, so multi-table work is safer as one planned migration.
7. Rate limits and AI quotas need an observed baseline before caps are imposed.

**Part C — Gaps**
The existing eight sections, priority order and technical notes carried over unchanged.

## Notes
- Written as a new versioned file; the original document is left intact.
- Document-only change. No application code, schema or edge functions are touched.
