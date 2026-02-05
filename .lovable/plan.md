

## PhonePe Payment Gateway Integration

### Credentials Summary

| Secret Name | Value |
|-------------|-------|
| PHONEPE_CLIENT_ID | SU2602051653302312343687 |
| PHONEPE_CLIENT_SECRET | 6760dd05-fe02-4271-a5d2-92625b54daf9 |
| PHONEPE_WEBHOOK_USERNAME | nythicai_webhook |
| PHONEPE_WEBHOOK_PASSWORD | NythicAI2025Webhook |

### URL Configuration

| Purpose | URL |
|---------|-----|
| Webhook | `https://lnoeofoucvyopmhcfwes.supabase.co/functions/v1/phonepe-webhook` |
| Success Redirect | `https://nythicai.com/payment-status?status=success` |
| Failure Redirect | `https://nythicai.com/payment-status?status=failed` |

---

### Implementation Steps

#### Step 1: Store Secrets
Store all 4 PhonePe credentials as Supabase secrets.

#### Step 2: Database Migration
Add PhonePe transaction tracking columns:
- `phonepe_transaction_id` - PhonePe's transaction ID
- `phonepe_merchant_transaction_id` - Our unique transaction ID (with UNIQUE constraint)
- `payment_gateway` - Default 'phonepe'

#### Step 3: Create `create-phonepe-payment` Edge Function
- Authenticates user
- Creates pending purchase record
- Calls PhonePe API to initiate payment
- Returns payment redirect URL

#### Step 4: Create `phonepe-webhook` Edge Function
- Verifies Basic Auth (username/password)
- Verifies PhonePe signature
- Updates purchase status
- Grants course access on success

#### Step 5: Update `SelectCourse.tsx`
- Remove dummy payment dialog
- Call edge function on "Buy Now"
- Redirect to PhonePe payment page

#### Step 6: Create `PaymentStatus.tsx`
- Handle redirects from PhonePe
- Show success/failure UI
- Redirect to dashboard on success

#### Step 7: Update Routes
Add `/payment-status` route in App.tsx

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/create-phonepe-payment/index.ts` | Create |
| `supabase/functions/phonepe-webhook/index.ts` | Create |
| `src/pages/SelectCourse.tsx` | Modify |
| `src/pages/PaymentStatus.tsx` | Create |
| `src/App.tsx` | Modify |
| `supabase/config.toml` | Modify |

---

### Technical Details

**PhonePe API Flow:**
1. Generate merchant transaction ID: `NYTHIC_{bundleId}_{timestamp}`
2. Create base64 encoded payload with amount, callback URL, redirect URLs
3. Generate X-VERIFY checksum: SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
4. POST to `https://api.phonepe.com/apis/hermes/pg/v1/pay`
5. Return payment page URL to frontend

**Webhook Verification:**
1. Check Basic Auth header matches stored username/password
2. Verify X-VERIFY signature from PhonePe
3. Parse response and update database
4. Grant course access via existing `auto_assign_subjects_on_purchase` trigger

**User Flow:**
1. Student clicks "Buy Now" → Loading state
2. Edge function creates pending purchase → Returns PhonePe URL
3. Student redirected to PhonePe → Completes payment
4. PhonePe calls webhook → Backend grants access
5. Student redirected to nythicai.com/payment-status → Success message
6. Auto-redirect to /student dashboard

