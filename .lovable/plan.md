
## Fix: PhonePe Payment Authorization & Duplicate Purchase Issues

### Problems Identified

Based on the edge function logs:

1. **OAuth Token Not Being Used** (17:02:53 logs)
   - The deployed version is NOT calling the OAuth token function
   - Logs show: Bundle found → Pending purchase created → PhonePe payload (skipping token acquisition)
   - Missing logs: "Requesting PhonePe access token..." and "Access token obtained successfully"
   - This means the latest code with OAuth wasn't deployed properly

2. **Duplicate Purchase Constraint Error** (17:06:19 logs)
   - Error: `duplicate key value violates unique constraint "student_purchases_student_id_bundle_id_key"`
   - There's already a pending purchase for this user/bundle
   - The code doesn't handle retrying after a failed payment

### Solution

#### Step 1: Fix Duplicate Purchase Handling
Before creating a new purchase, check for existing pending/failed purchases and either:
- Reuse an existing pending purchase
- Update an existing failed purchase to pending

#### Step 2: Redeploy with OAuth Logic
Ensure the OAuth token acquisition logic is properly deployed.

### Code Changes Required

**File: `supabase/functions/create-phonepe-payment/index.ts`**

Replace the purchase creation logic (lines 115-137) to:
1. First check for existing pending purchase for this user/bundle
2. If found, reuse it (update the merchant transaction ID)
3. If not found, check for failed purchase and reset it
4. Only create new if neither exists

```typescript
// Check for existing pending or failed purchase for this user/bundle
const { data: existingPurchase } = await supabaseAdmin
  .from('student_purchases')
  .select('*')
  .eq('student_id', user.id)
  .eq('bundle_id', bundleId)
  .in('payment_status', ['pending', 'failed'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

let purchase;

if (existingPurchase) {
  // Reuse existing purchase - update with new transaction ID
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('student_purchases')
    .update({
      payment_status: 'pending',
      phonepe_merchant_transaction_id: merchantTransactionId,
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', existingPurchase.id)
    .select()
    .single();
  
  if (updateError) throw updateError;
  purchase = updated;
  console.log('Reusing existing purchase:', purchase.id);
} else {
  // Create new purchase
  const { data: newPurchase, error: purchaseError } = await supabaseAdmin
    .from('student_purchases')
    .insert({...})
    .select()
    .single();
    
  if (purchaseError) throw purchaseError;
  purchase = newPurchase;
  console.log('New purchase created:', purchase.id);
}
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-phonepe-payment/index.ts` | Handle existing pending/failed purchases before creating new ones |

### Deployment

After code changes, redeploy the `create-phonepe-payment` function to ensure the latest OAuth and duplicate handling logic is active.

### Testing

1. Click "Buy Now" on `/select-course`
2. Check logs for:
   - "Requesting PhonePe access token..."
   - "Access token obtained successfully"
   - "Reusing existing purchase" OR "New purchase created"
3. Verify redirect to PhonePe payment page
