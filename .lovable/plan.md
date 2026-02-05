
## Switch to PhonePe Production: Verification & Configuration

### Current Status

Your Edge Functions are already pointing to **PhonePe Production URLs**:
- Token: `https://api.phonepe.com/apis/identity-manager/v1/oauth/token`
- Payment: `https://api.phonepe.com/apis/pg/checkout/v2/pay`

### What You Need to Verify

#### 1. Production Credentials
Ensure your stored secrets are **production credentials**, not sandbox:

| Secret | Value Type |
|--------|-----------|
| `PHONEPE_CLIENT_ID` | Must be production Client ID from PhonePe Dashboard |
| `PHONEPE_CLIENT_SECRET` | Must be production Client Secret from PhonePe Dashboard |

If these are sandbox credentials, the production API will reject them.

#### 2. Configure Webhook URL in PhonePe Dashboard

This is the most likely cause of "Something went wrong" errors. You must configure:

**Webhook URL:**
```
https://lnoeofoucvyopmhcfwes.supabase.co/functions/v1/phonepe-webhook
```

**Authentication:** Basic Auth
- Username: (value stored in `PHONEPE_WEBHOOK_USERNAME`)
- Password: (value stored in `PHONEPE_WEBHOOK_PASSWORD`)

**Webhook Events to Subscribe:**
- `checkout.order.completed`
- `checkout.order.failed`

#### 3. PhonePe Dashboard Configuration Steps

1. Log in to PhonePe Merchant Dashboard
2. Navigate to **Settings** → **Webhooks** or **Callback Configuration**
3. Add a new webhook endpoint:
   - **URL**: `https://lnoeofoucvyopmhcfwes.supabase.co/functions/v1/phonepe-webhook`
   - **Authentication Type**: Basic Auth
   - **Username**: Your `PHONEPE_WEBHOOK_USERNAME` value
   - **Password**: Your `PHONEPE_WEBHOOK_PASSWORD` value
4. Subscribe to events: `checkout.order.completed`, `checkout.order.failed`
5. Save and test the webhook

### If You Have Sandbox Credentials

If your current `PHONEPE_CLIENT_ID` and `PHONEPE_CLIENT_SECRET` are sandbox credentials, you need to:

1. Get production credentials from PhonePe Merchant Dashboard
2. Update the secrets with the new production values

### No Code Changes Required

The Edge Functions are already correctly configured for production. The only actions needed are:
1. Verify credentials are production (not sandbox)
2. Configure the webhook URL in PhonePe Dashboard

### Testing After Configuration

1. Click "Buy Now" on `/select-course`
2. Complete payment on PhonePe page
3. Check Edge Function logs for `phonepe-webhook` to see incoming callbacks
4. Verify `student_purchases` table is updated to `completed` status
