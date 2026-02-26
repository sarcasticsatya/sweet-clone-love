

## Feature: Time-Limited Discount Pricing with Real-Time Countdown

### Overview
Add admin-configurable discount pricing to course bundles, showing original price slashed with a discounted price and a live countdown timer (like Myntra/Ajio flash sales) on the purchase page. The discount auto-expires after admin-set duration.

### Database Changes

Add 3 new columns to the `course_bundles` table:

```sql
ALTER TABLE course_bundles
  ADD COLUMN original_price_inr numeric DEFAULT NULL,
  ADD COLUMN discount_price_inr numeric DEFAULT NULL,
  ADD COLUMN discount_expires_at timestamptz DEFAULT NULL;
```

- `original_price_inr` — The MRP / original price (shown struck-through)
- `discount_price_inr` — The discounted selling price (what the student pays)
- `discount_expires_at` — Timestamp when the discount ends (NULL = no active discount)

The existing `price_inr` column continues to be the actual payable price. When admin sets a discount, `original_price_inr` stores the original and `price_inr` gets the discounted value. When discount expires, the frontend hides the discount UI and shows `price_inr` as-is.

**Alternative approach (simpler):** Keep `price_inr` as the original/base price always. Add `discount_price_inr` and `discount_expires_at`. The purchase page checks: if `discount_price_inr` is set AND `discount_expires_at > now()`, show the discount; otherwise show `price_inr` as the regular price. This avoids needing to "reset" prices after expiry.

I will use the simpler approach:
- `price_inr` = original/MRP price (always)
- `discount_price_inr` = sale price (nullable, only when discount is active)
- `discount_expires_at` = when discount ends (nullable)

### Admin Dashboard — ManageCourses.tsx

Add 3 new fields to the course create/edit dialog:

1. **Original Price (MRP)** — already exists as `price_inr`, relabel to "Original Price (MRP) in Rupees"
2. **Discounted Price** — new field for `discount_price_inr`
3. **Discount Duration (days)** — admin enters number of days; on save, compute `discount_expires_at = now() + N days`

The admin table also shows a "Discount" column showing the discounted price and remaining time if active.

### Purchase Page — SelectCourse.tsx

Update the course card pricing section:

1. **When discount is active** (`discount_price_inr` is set AND `discount_expires_at` is in the future):
   - Show original price struck through: ~~Rs 5,999~~
   - Show discounted price prominently: Rs 2,999
   - Show a percentage badge: "50% OFF"
   - Show a live countdown timer: "Offer ends in 2d 14h 32m 18s"
   - The countdown updates every second using `setInterval`

2. **When no discount or expired**:
   - Show `price_inr` as the regular price (no strikethrough, no timer)

3. **Coupon stacking**: If a student also applies a coupon code, the coupon discount applies on top of the already-discounted price

### Payment Integration

Update the `create-phonepe-payment` edge function (or the client-side logic) to use `discount_price_inr` when the discount is active, falling back to `price_inr` when expired. The edge function already reads from the database, so it will pick up the correct price.

### Files to Change

| File | Change |
|------|--------|
| Database migration | Add `discount_price_inr` and `discount_expires_at` columns |
| `src/components/admin/ManageCourses.tsx` | Add discount price + duration fields to form; show discount info in table |
| `src/pages/SelectCourse.tsx` | Show strikethrough pricing, discount badge, and live countdown timer |
| `supabase/functions/create-phonepe-payment/index.ts` | Use discounted price when active discount exists |

### Countdown Timer Implementation

```text
Component: CountdownTimer
- Props: expiresAt (Date)
- Uses setInterval(1s) to compute remaining days/hours/minutes/seconds
- Renders: "Offer ends in Xd Xh Xm Xs" with animated styling
- Auto-hides when countdown reaches zero
- Styled with urgency colors (red/orange badge, pulsing animation)
```

### Technical Details

- The discount expiry check is done client-side for display (comparing `discount_expires_at` with `new Date()`)
- The payment edge function also validates server-side that the discount is still valid before applying it
- No cron job needed — the discount simply stops showing when the timestamp passes
- Admin can remove a discount by clearing the discounted price field
