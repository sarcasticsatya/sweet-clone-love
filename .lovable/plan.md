

## Plan: Dynamic Mediums + Payment Receipt Generation

Two features: (1) Allow admins to add new medium types beyond English/Kannada, and (2) generate downloadable payment receipts.

---

### Feature 1: Dynamic Medium Types

Currently, the `medium` field on subjects is a free-text column, but the Content tab hardcodes only "English" and "Kannada" as tabs. The fix is to make the tabs dynamic by reading distinct mediums from the `subjects` table and the `course_bundles` table names.

**Changes:**

**`src/components/admin/ManageContent.tsx`**
- Remove the hardcoded `type Medium = "English" | "Kannada"` type
- On load, query distinct `medium` values from the `subjects` table
- Render tabs dynamically based on those values plus allow adding a new medium via an "Add Medium" button (simple dialog with a text input)
- When creating a subject, use the currently selected medium tab value
- The medium tabs become fully dynamic (if admin adds "Hindi" subjects, a "Hindi Medium" tab appears)

**`src/components/admin/ManageCourses.tsx`**
- No schema change needed -- course bundles already have a `name` field. The existing trigger `auto_assign_subjects_on_purchase` already matches medium from the bundle name (e.g., "Hindi" in the name assigns Hindi medium subjects)
- Add a note in the course creation form reminding admin that the bundle name should include the medium name (e.g., "SSLC Hindi Medium") for auto-assignment to work

**Database trigger update:**
- The existing `auto_assign_subjects_on_purchase` trigger checks if the bundle name contains "English" or "Kannada". We need to update it to dynamically match ANY medium by checking all known mediums from the subjects table, rather than hardcoding only two.

**`src/pages/Auth.tsx`** (signup form)
- The signup form likely has a hardcoded medium dropdown (English/Kannada). Update it to fetch available mediums dynamically from the `subjects` table.

---

### Feature 2: Payment Receipt (Invoice) Generation

Generate a professional PDF receipt styled like an e-commerce invoice, with NythicAI branding.

**New file: `src/lib/generateReceipt.ts`**
- Uses `jspdf` (already installed) to generate a branded PDF
- Header: NythicAI logo + company name + tagline
- Body: Order Invoice table with transaction ID, date, course name, amount, discount, total paid, payment method, validity period
- Footer: "Thank you for choosing NythicAI" + support contact
- Returns a downloadable PDF blob

**`src/pages/UserProfile.tsx`**
- Add a "Download Receipt" button next to each completed payment in the Payment History section
- Clicking it calls `generateReceipt()` with the transaction data and triggers a PDF download

**`src/components/admin/ManagePayments.tsx`**
- Add a "Receipt" button column in the payments table for completed payments
- Clicking it generates and downloads the same receipt PDF for that student's transaction

**No new database tables or backend functions needed** -- all receipt data (student name, course, amount, date, transaction ID) is already available from existing queries.

---

### Files Modified

| File | Change |
|------|--------|
| `src/components/admin/ManageContent.tsx` | Dynamic medium tabs instead of hardcoded English/Kannada |
| `src/components/admin/ManageCourses.tsx` | Add medium hint in course creation form |
| `src/pages/Auth.tsx` | Dynamic medium options in signup dropdown |
| `src/lib/generateReceipt.ts` | **New** -- PDF receipt generator using jspdf |
| `src/pages/UserProfile.tsx` | Add "Download Receipt" button per transaction |
| `src/components/admin/ManagePayments.tsx` | Add "Receipt" button per payment row |
| **Database migration** | Update `auto_assign_subjects_on_purchase` trigger to dynamically match mediums |

