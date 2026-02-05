

## Fix: Deploy Missing Email Verification Edge Functions

### Problem Identified

The email verification is failing with a **404 Not Found** error because the two critical edge functions have never been deployed:
- `send-verification-email` - Sends the verification email via Resend
- `verify-email-token` - Validates the token when user clicks the link

The functions exist in code and are configured in `config.toml`, but they were never deployed to the backend.

### Solution

Deploy both edge functions immediately.

### Steps

1. **Deploy the edge functions** using the deploy tool:
   - `send-verification-email`
   - `verify-email-token`

2. **Verify deployment** by testing the edge function endpoint

3. **Test the flow** by clicking "Resend Verification Email" on the /not-verified page

### Files Involved

| File | Status |
|------|--------|
| `supabase/functions/send-verification-email/index.ts` | Exists, needs deployment |
| `supabase/functions/verify-email-token/index.ts` | Exists, needs deployment |
| `supabase/config.toml` | Already configured correctly |

### Post-Deployment Verification

After deployment:
1. The "Resend Verification Email" button should work
2. Emails will be sent via Resend to the user's email
3. Clicking the verification link will validate the token and mark email as verified

