# Platform Gap Analysis — Nythic AI

Verified against the live schema and current code. Grouped by area, with the highest-impact gaps first.

## 1. Analytics & demand intelligence (your identified gap)

Confirmed today: the `student_activity_logs` table exists but holds **0 rows** — no code anywhere writes to it. GA4, GTM and Meta Pixel are installed in `index.html`, but the only event fired is `PageView`; there are no `begin_checkout`, `purchase`, `sign_up` or Meta `Purchase` events. So there is currently **no funnel, traffic or demand data at all**.

Missing:
- Event capture: page/course-page views, checkout starts, payment success/failure, signups, chapter opens, tool usage (chat/quiz/flashcards/mindmap/infographic), session duration.
- Peak-demand reporting: hits by hour-of-day / day-of-week, conversion rate by time slot, geo (city/school) demand.
- Funnel analytics: visitors → signup → course page → checkout → paid, with drop-off at each step.
- Revenue analytics: daily/weekly/monthly revenue, ARPU, refunds, coupon-attributed revenue, bundle-wise performance.
- Cohort & retention: activation (first chapter opened), 7/30-day active students, churn before expiry.
- Cost analytics: AI token spend per student/subject vs. revenue (currently invisible).

## 2. Dynamic / demand-based pricing

Today pricing is a static price plus a manual time-boxed discount. Missing:
- Rule engine: auto-adjust price by demand signal (hits, conversion rate, seats sold, time-to-exam).
- Surge/off-peak rules and floor/ceiling price guards.
- Scheduled campaigns (start/end datetime, not just "X days").
- Price-change audit history and A/B price testing with revenue comparison.
- Cart abandonment recovery (nudge/discount to users who reached checkout and dropped).

## 3. Exports & reporting

- Exports are client-side only, unbounded — a large dataset will freeze the browser; no server-side/streamed export, no row limit or progress.
- No date-range or course/medium/city filter on payment exports (only status).
- No scheduled or emailed reports (daily revenue, weekly student progress to parents).
- No reconciliation export: PhonePe transaction ID vs. settlement, refunds, GST/tax summary, invoice register.
- No CSV option (Excel only) and no export audit trail of who exported personal data.

## 4. Payments & billing

- No refund workflow in admin (policy exists in legal pages, no operational path).
- No renewal / expiry lifecycle: no "expires in 7 days" reminders, no renew flow, no auto-revoke visibility.
- No retry/repair tool for stuck `pending` purchases beyond status polling.
- No partial payments/instalments, no manual/offline payment entry for cash collections.
- Coupons: no per-student usage cap, no first-purchase-only or bundle-scoped rules, no coupon performance report.

## 5. Admin operations

- No admin activity/audit log (who deleted a medium, changed a price, deleted a student).
- No bulk operations: bulk student import, bulk subject assignment, bulk chapter upload.
- No content versioning or soft delete/undo — destructive deletes are permanent.
- No health dashboard: failed PDF extractions, failed AI generations, edge-function error rates.
- No second admin role tier (support/viewer vs. full admin).

## 6. Student experience

- No progress dashboard: chapters completed, quiz history trend, weak-topic detection.
- No notifications (in-app or email) for new chapters, expiry, quiz results.
- No search across chapters/subjects, no bookmarks or notes.
- No offline/download of chapter material, no PWA install.
- Accessibility not audited (keyboard nav, contrast, screen readers).

## 7. Growth, SEO & trust

- Landing page has no course-level SEO pages, no JSON-LD `Course`/`Organization` schema, no sitemap strategy for course URLs.
- No testimonials, sample content preview, or free-trial chapter to convert visitors.
- No referral programme or school/bulk licence flow.
- No blog/content marketing surface despite strong organic potential for SSLC keywords.

## 8. Reliability & security

- No error monitoring/alerting for the frontend or the Cloudflare Worker proxy (silent failures today).
- No rate limiting on AI edge functions — token spend is uncapped per student.
- No per-student AI usage quota.
- No automated backup/restore verification routine documented.
- Personal data (parent mobile, email) is exported freely without masking or access logging.

## Suggested priority order

1. Event tracking + analytics data model (unblocks everything else in this list).
2. Admin analytics dashboard: revenue, funnel, peak-demand heatmap.
3. Dynamic pricing rule engine built on top of that data.
4. Export hardening (server-side, filtered, reconciliation-ready).
5. Refund/renewal lifecycle + notifications.
6. Audit logging, rate limiting, error monitoring.

## Technical notes

- New tables would be needed: `analytics_events` (anonymous + student-linked, hourly rollups), `pricing_rules`, `price_history`, `admin_audit_log`, `notifications`. Each needs RLS plus explicit GRANTs; analytics writes should go through an edge function so anonymous visitors can be recorded without opening the table to public inserts.
- Peak-demand reporting should read from a pre-aggregated rollup table (materialised hourly), not raw events, to keep the admin dashboard fast.
- GA4/Meta events should be fired from a single typed helper so client and server-side (webhook) purchase events stay consistent.
- Server-side purchase confirmation should be the source of truth for revenue numbers, driven by the PhonePe webhook rather than the browser.

No code changes are made by this document — tell me which sections to build and I will plan the implementation.
