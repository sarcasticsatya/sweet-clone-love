-- Add PhonePe transaction tracking columns to student_purchases
ALTER TABLE public.student_purchases 
ADD COLUMN IF NOT EXISTS phonepe_transaction_id text,
ADD COLUMN IF NOT EXISTS phonepe_merchant_transaction_id text,
ADD COLUMN IF NOT EXISTS payment_gateway text DEFAULT 'phonepe';

-- Add unique constraint on merchant transaction ID
ALTER TABLE public.student_purchases 
ADD CONSTRAINT student_purchases_phonepe_merchant_transaction_id_key UNIQUE (phonepe_merchant_transaction_id);

-- Add RLS policy for service role to update purchases (webhook needs this)
CREATE POLICY "Service role can update purchases" 
ON public.student_purchases 
FOR UPDATE 
USING (true)
WITH CHECK (true);