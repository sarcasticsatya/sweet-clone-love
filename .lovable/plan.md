

## PhonePe Webhook Implementation Verification

After reviewing the official PhonePe documentation and your current implementation, I found **two critical issues** that need to be fixed.

---

### Issue #1: Wrong Authorization Header Verification Method

**Documentation says:**
```
Authorization: SHA256(username:password)
```

PhonePe sends a **SHA256 hash** of `username:password` in the Authorization header.

**Your current implementation:**
```typescript
// Decode Basic Auth credentials
const base64Credentials = authHeader.slice(6);
const credentials = atob(base64Credentials);
const [username, password] = credentials.split(':');
```

You're treating it as **Base64-encoded Basic Auth**, but PhonePe sends a **SHA256 hash**.

---

### Issue #2: Wrong Field Names for Event Parsing

**Documentation says:**
- Use `event` parameter (NOT `type`) to identify the event
- Use `payload.state` for payment status
- Use `payload.merchantOrderId` for the order ID

**Your current implementation:**
```typescript
const { type, payload: eventPayload } = payload;
const state = eventPayload.state;  // ✓ Correct
const merchantOrderId = eventPayload.merchantOrderId;  // ✓ Correct
```

You're extracting `type` but should use `event` instead.

---

### Correct Webhook Payload Structure

```json
{
    "event": "checkout.order.completed",
    "payload": {
        "orderId": "OMO2403282020198641071317",
        "merchantId": "merchantId",
        "merchantOrderId": "merchantOrderId",
        "state": "COMPLETED",
        "amount": 10000,
        ...
    }
}
```

---

### Required Fixes

| Component | Current | Should Be |
|-----------|---------|-----------|
| Auth verification | Base64 decode + compare | SHA256 hash comparison |
| Event type field | `type` | `event` |

---

### Proposed Code Changes

**1. Update Authorization Verification:**
```typescript
// PhonePe sends: Authorization: SHA256(username:password)
const authHeader = req.headers.get('Authorization');

// Create expected hash
const expectedHash = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(`${expectedUsername}:${expectedPassword}`)
);
const expectedHashHex = Array.from(new Uint8Array(expectedHash))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

// Compare with received header
if (authHeader !== expectedHashHex) {
  return new Response('Unauthorized', { status: 401 });
}
```

**2. Update Event Parsing:**
```typescript
const { event, payload: eventPayload } = payload;
console.log('Event:', event);  // checkout.order.completed or checkout.order.failed
```

---

### Your Dashboard Configuration Checklist

| Item | Status | Notes |
|------|--------|-------|
| Webhook URL | ✓ Verify | `https://lnoeofoucvyopmhcfwes.supabase.co/functions/v1/phonepe-webhook` |
| Username | ✓ Verify | Must be 5-20 chars, letters/digits/underscores only |
| Password | ✓ Verify | Must be 8-20 chars, must contain both letters AND numbers |
| Test Mode Toggle | **Check** | Must be **OFF** for production |
| Events subscribed | ✓ Verify | `checkout.order.completed`, `checkout.order.failed` |

---

### Credential Format Rules (From Documentation)

Your webhook credentials must meet these requirements:
- **Username**: 5-20 characters, letters, digits, and underscores only
- **Password**: 8-20 characters, must contain both letters and numbers

**Your current credentials:**
- Username: `nythicai_webhook` → ✓ Valid (14 chars, letters/digits/underscores)
- Password: `NythicAI2025Webhook` → ❌ **19 chars** (valid length 8-20) ✓, has letters and numbers ✓

---

### Summary

Your webhook implementation needs two code fixes:
1. Change authorization from Basic Auth to SHA256 hash verification
2. Change `type` field to `event` field

Once fixed, if you've correctly:
- Set Test Mode toggle to **OFF** in PhonePe Dashboard
- Configured webhook with valid username/password
- Subscribed to the correct events

The webhook should work in production.

