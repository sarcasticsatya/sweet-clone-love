

## Fix: Auto-Verify Payment on Redirect (Webhook Fallback)

**Problem**: The PhonePe webhook is never reaching the backend (zero logs ever recorded). When a student completes payment and gets redirected back, the PaymentStatus page just polls the database -- but since only the webhook can update the status, it stays "pending" forever and the student never gets access.

**Solution**: Create a new backend function that checks the payment status directly with PhonePe's API when the student is redirected back. This acts as the primary verification path (not just a fallback), ensuring instant access regardless of whether the webhook arrives.

---

### Changes

**1. New Backend Function: `check-phonepe-status`**

A new function that:
- Accepts a `merchantTransactionId` from the authenticated user
- Calls PhonePe's Order Status API: `GET https://api.phonepe.com/apis/pg/checkout/v2/order/{merchantOrderId}/status`
- Uses OAuth token (same `getPhonePeAccessToken` logic from the payment creation function)
- If PhonePe says `COMPLETED`, updates the purchase record to `payment_status = 'completed'`
- The existing database trigger (`on_purchase_complete`) then automatically assigns subjects
- Returns the current status to the frontend

**2. Update PaymentStatus Page (`src/pages/PaymentStatus.tsx`)**

Instead of just reading the database in a loop, the page will:
- On load, call the `check-phonepe-status` function with the `merchantTransactionId`
- This function verifies with PhonePe, updates the DB if completed, and returns the result
- If still pending, retry a few times with delays (in case PhonePe is still processing)
- Show success/failure based on the verified result

**3. Config Update (`supabase/config.toml`)**

Add the new function with `verify_jwt = false` (auth is validated in-code).

**4. Fix for ASHOK D (immediate)**

Run a one-time SQL update to mark ASHOK D's payment as completed so he gets instant access now.

---

### Flow After Fix

```text
Student completes payment on PhonePe
         |
         v
Redirected to /payment-status?merchantTransactionId=NYTHIC_xxx
         |
         v
PaymentStatus page calls check-phonepe-status function
         |
         v
Function gets OAuth token, calls PhonePe Order Status API
         |
         v
If COMPLETED --> updates student_purchases --> trigger assigns subjects
         |
         v
Returns "completed" to frontend --> shows success, student has access
```

### Files Modified

- **New file**: `supabase/functions/check-phonepe-status/index.ts` -- server-side PhonePe status verification
- **Edit**: `supabase/config.toml` -- add new function config
- **Edit**: `src/pages/PaymentStatus.tsx` -- call the new function instead of just polling DB
- **Database**: One-time SQL to fix ASHOK D's pending payment

