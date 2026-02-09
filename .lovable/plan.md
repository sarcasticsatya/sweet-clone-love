

## Fix Subject Assignment + Admin Course/Coupon/Payment Management

This plan addresses 4 major areas: fixing the broken subject auto-assignment, adding admin course management, implementing coupon codes, and showing payment details to admin.

---

### Root Cause: Subjects Not Assigned After Payment

The database functions `auto_assign_subjects_on_purchase` and `auto_assign_subject_to_students` exist, but **no triggers are attached to them**. The query confirms zero triggers in the database. The webhook correctly updates payment status to "completed", but nothing fires to assign subjects.

Additionally, the webhook should explicitly assign subjects as a safety net, not rely solely on triggers.

---

### Changes Overview

**1. Database Migration (SQL)**

- **Create missing triggers** on `student_purchases` and `subjects` tables to fire the existing auto-assign functions
- **Create `coupon_codes` table** with fields: `id`, `code`, `discount_percent`, `max_uses`, `used_count`, `is_active`, `valid_from`, `valid_until`, `created_at`
- **Add `coupon_code_applied` and `discount_amount` columns** to `student_purchases` table
- **RLS policies** for `coupon_codes`: admin full access, authenticated users can SELECT active coupons

**2. Webhook Fix (`supabase/functions/phonepe-webhook/index.ts`)**

- After marking purchase as "completed", explicitly run subject assignment logic in the webhook itself (query bundle medium, insert into `student_subject_access`) as a safety net alongside the trigger

**3. Payment Edge Function Update (`supabase/functions/create-phonepe-payment/index.ts`)**

- Accept optional `couponCode` parameter
- Validate coupon server-side (check active, not expired, usage limit)
- Apply discount to payment amount
- Store coupon info on purchase record
- Increment `used_count` on the coupon

**4. Admin Dashboard - New "Courses" Tab (`src/components/admin/ManageCourses.tsx`)**

- List all course bundles with name, price, validity, status
- Edit existing bundles (price, validity days, name, description, active/inactive toggle)
- Add new course bundles (e.g., 6-month package at different price)
- Delete/deactivate bundles

**5. Admin Dashboard - New "Payments" Tab (`src/components/admin/ManagePayments.tsx`)**

- Table showing all student purchases with: student name, course name, amount paid, discount applied, payment date, payment status (color-coded), course duration, expiry date, days remaining
- Filter by payment status (completed/pending/failed)
- Search by student name

**6. Admin Dashboard - Coupon Management (`src/components/admin/ManageCoupons.tsx`)**

- Create coupon codes with discount %, max uses, validity period
- View all coupons with usage stats
- Activate/deactivate coupons
- Delete coupons

**7. Admin Dashboard Layout (`src/pages/AdminDashboard.tsx`)**

- Add 3 new tabs: "Courses", "Payments", "Coupons"
- Reorganize tab grid from 5 to 8 columns (or use scrollable tabs)

**8. Student Course Selection Page (`src/pages/SelectCourse.tsx`)**

- Add coupon code input field
- Validate coupon via edge function before payment
- Show discounted price when valid coupon applied
- Pass coupon to payment function

**9. Student Profile (`src/pages/UserProfile.tsx`)**

- Already shows days remaining -- will continue to work correctly
- Add display of discount applied if coupon was used

---

### Technical Details

**Database Migration SQL:**

```text
-- 1. Create triggers for auto-assignment
CREATE TRIGGER on_purchase_completed
  AFTER UPDATE ON public.student_purchases
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM 'completed' AND NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.auto_assign_subjects_on_purchase();

CREATE TRIGGER on_subject_created
  AFTER INSERT ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_subject_to_students();

-- 2. Coupon codes table
CREATE TABLE public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage coupons" ON public.coupon_codes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Students can view active coupons (for validation)
CREATE POLICY "Authenticated can view active coupons" ON public.coupon_codes
  FOR SELECT USING (is_active = true);

-- 3. Add coupon fields to student_purchases
ALTER TABLE public.student_purchases
  ADD COLUMN coupon_code_applied text DEFAULT NULL,
  ADD COLUMN discount_amount numeric DEFAULT 0;
```

**New Files:**
- `src/components/admin/ManageCourses.tsx`
- `src/components/admin/ManagePayments.tsx`
- `src/components/admin/ManageCoupons.tsx`

**Modified Files:**
- `supabase/functions/phonepe-webhook/index.ts` -- add explicit subject assignment
- `supabase/functions/create-phonepe-payment/index.ts` -- add coupon validation
- `src/pages/AdminDashboard.tsx` -- add 3 new tabs
- `src/pages/SelectCourse.tsx` -- add coupon input
- `src/pages/UserProfile.tsx` -- show discount info

