
## Fix: Deploy create-phonepe-payment Edge Function

### Problem Identified

The payment is failing with **"Failed to send a request to the Edge Function"** because:

1. **The `create-phonepe-payment` Edge Function has never been deployed** - there are no logs for it, meaning the endpoint returns 404
2. The function also needs the `phonepe-webhook` function deployed to handle payment callbacks

### Root Cause

When checking the edge function logs, there were "No logs found" for `create-phonepe-payment`. The console error shows "Failed to fetch" which is what happens when trying to call a non-existent endpoint.

### Solution

Deploy both payment-related Edge Functions immediately:
- `create-phonepe-payment` - Initiates the PhonePe payment
- `phonepe-webhook` - Handles payment completion callbacks

### Steps

1. **Update the import version** to pin `@supabase/supabase-js@2.49.1` in both files to prevent bundling timeout issues

2. **Deploy both functions**:
   - `create-phonepe-payment`
   - `phonepe-webhook`

3. **Test the payment flow** on the /select-course page

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-phonepe-payment/index.ts` | Pin supabase-js version to `@2.49.1` |
| `supabase/functions/phonepe-webhook/index.ts` | Pin supabase-js version to `@2.49.1` |

### Technical Details

The current import:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

Should be changed to:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
```

### Expected Outcome

After deployment:
1. The "Buy Now" button on /select-course will work
2. Users will be redirected to PhonePe payment page
3. After payment, webhook will update purchase status
