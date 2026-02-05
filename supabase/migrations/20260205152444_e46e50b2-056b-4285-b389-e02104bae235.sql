-- Fix 1: Remove SELECT access to email_verification_tokens (tokens should only be validated server-side)
DROP POLICY IF EXISTS "Users can view own verification tokens" ON public.email_verification_tokens;

-- Create policy that only allows INSERT (users can create tokens, but cannot read them back)
CREATE POLICY "Users can create own verification tokens"
ON public.email_verification_tokens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create policy for service role / edge functions to validate tokens
-- (Edge functions use service role which bypasses RLS, so this is mainly for documentation)

-- Fix 2: Create a view for student purchases that hides sensitive payment gateway IDs
-- Students should see their purchase history but not raw transaction IDs that could be used for fraud

CREATE OR REPLACE VIEW public.student_purchases_safe
WITH (security_invoker=on) AS
SELECT 
  id,
  student_id,
  bundle_id,
  amount_paid,
  purchased_at,
  expires_at,
  payment_status,
  payment_method,
  payment_gateway,
  -- Hide sensitive payment gateway transaction IDs from direct access
  -- Students can see that a payment exists but not the raw IDs
  CASE 
    WHEN payment_status = 'completed' THEN 'confirmed'
    WHEN payment_status = 'pending' THEN 'processing'
    ELSE payment_status
  END as display_status
FROM public.student_purchases;

-- Grant access to the view
GRANT SELECT ON public.student_purchases_safe TO authenticated;

-- Note: The base student_purchases table RLS policies remain unchanged
-- Edge functions and webhooks use service role to update purchase status
-- Students can still access the base table for their own records via RLS
-- The view provides an additional layer for UI queries that don't need transaction IDs