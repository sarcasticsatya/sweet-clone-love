
ALTER TABLE public.course_bundles
  ADD COLUMN discount_price_inr numeric DEFAULT NULL,
  ADD COLUMN discount_expires_at timestamptz DEFAULT NULL;
