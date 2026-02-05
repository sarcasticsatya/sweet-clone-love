

## Plan: Add Payment History & Update Logos

### Overview

This plan covers two main tasks:
1. **Add a Payment History section** to the User Profile page showing all past transactions
2. **Update the logo/icon** everywhere in the application with the new brand assets

---

### Part 1: Payment History Section

#### Current State
The UserProfile page currently shows only the **active/latest purchase** in the "Subscription Details" card. It fetches a single purchase with `limit(1)`.

#### Changes Required

**Modify `src/pages/UserProfile.tsx`:**

1. Add new state for payment history:
   ```typescript
   const [paymentHistory, setPaymentHistory] = useState<Purchase[]>([]);
   ```

2. Update `loadProfile()` to fetch ALL purchases (not just the latest):
   - Fetch all purchases for the user ordered by date descending
   - Include all payment statuses (completed, pending, failed)

3. Add a new Card component "Payment History" after the existing "Subscription Details" card:
   - Display a table/list showing:
     - Date of transaction
     - Course bundle name
     - Amount paid
     - Payment status (with color-coded badges)
     - Payment gateway used
   - Handle empty state when no transactions exist
   - Add the `Receipt` icon from lucide-react for the card header

4. Add new import for `Receipt` icon from lucide-react

#### UI Design
- Table format on desktop, card list on mobile
- Status badges: Green for "Completed", Yellow for "Pending", Red for "Failed"
- Most recent transactions first

---

### Part 2: Update Logos Everywhere

#### New Assets
- **Icon.png** - The "N" book icon (for favicon and small logo uses)
- **Logo.png** - Full logo with "Nythic AI" text (for larger branding)

#### Files to Update

| Location | Current | Change To |
|----------|---------|-----------|
| `src/assets/nythic-logo.png` | Old logo | Replace with new **Icon.png** |
| `public/nythic-logo.png` | Old logo (favicon) | Replace with new **Icon.png** |
| `src/components/Logo.tsx` | Uses old logo | No code change needed (uses same filename) |
| `index.html` | References `/nythic-logo.png` | No code change needed |

#### Asset Copy Operations
1. Copy `user-uploads://Icon.png` → `src/assets/nythic-logo.png` (overwrites existing)
2. Copy `user-uploads://Icon.png` → `public/nythic-logo.png` (overwrites existing for favicon)

The Logo component and all its usages will automatically pick up the new logo since the import path remains the same.

#### Where Logo is Currently Used
- `src/components/Logo.tsx` - Main Logo component
- `src/pages/UserProfile.tsx` - Header
- `src/pages/StudentDashboard.tsx` - Header
- `src/pages/AdminDashboard.tsx` - Header
- `src/pages/Auth.tsx` - Login/Signup form
- `src/pages/ResetPassword.tsx` - Reset password form
- `src/components/landing/HeroSection.tsx` - Landing page hero
- `src/components/student/ChatPanel.tsx` - AI chat avatar
- `index.html` - Favicon and apple-touch-icon

---

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/assets/nythic-logo.png` | Replace | New icon asset |
| `public/nythic-logo.png` | Replace | New favicon |
| `src/pages/UserProfile.tsx` | Modify | Add Payment History section |

---

### Technical Details

**Payment History Query:**
```typescript
const { data: historyData } = await supabase
  .from("student_purchases")
  .select(`
    id,
    amount_paid,
    purchased_at,
    expires_at,
    payment_status,
    payment_gateway,
    phonepe_merchant_transaction_id,
    bundle_id
  `)
  .eq("student_id", session.user.id)
  .order("purchased_at", { ascending: false });
```

**Payment Status Badge Colors:**
- `completed` → green (bg-green-100, text-green-700)
- `pending` → yellow (bg-yellow-100, text-yellow-700)  
- `failed` → red (bg-red-100, text-red-700)

---

### User Experience

After implementation:
1. Users navigate to Profile → See their personal info
2. Scroll to "Subscription Details" → See current active plan
3. Scroll to new "Payment History" → See all past transactions with status

The new logo will appear:
- In all page headers
- On the login/signup page
- On the landing page hero
- In the AI chat interface
- As the browser tab icon

