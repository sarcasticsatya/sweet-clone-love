
-- The on_purchase_completed trigger was already created in the previous migration.
-- The on_subject_created trigger already exists.
-- Now create the coupon_codes table and add columns to student_purchases.

CREATE TABLE IF NOT EXISTS public.coupon_codes (
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_codes' AND policyname = 'Admins can manage coupons') THEN
    CREATE POLICY "Admins can manage coupons" ON public.coupon_codes
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_codes' AND policyname = 'Authenticated can view active coupons') THEN
    CREATE POLICY "Authenticated can view active coupons" ON public.coupon_codes
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

ALTER TABLE public.student_purchases
  ADD COLUMN IF NOT EXISTS coupon_code_applied text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
