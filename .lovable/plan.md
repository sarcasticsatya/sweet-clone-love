

# Plan: Payment Data Export + Fix Medium Dialog Issue

## Task 1: Export Pending/Failed Payment Data as Excel

**What**: Add an "Export" button in the Payments tab that downloads an Excel file containing all pending and failed payment records with full student details.

**Data included**: Student Name, Phone Number (parent_mobile), Personal Email, Course Name, Amount, Payment Status, Payment Date, Transaction ID, Coupon Applied, Discount Amount.

**How**:
- Query `student_purchases` filtered by `payment_status` in ('pending', 'failed')
- Join with `student_profiles` to get name + `parent_mobile` (phone number)
- Join with `course_bundles` to get course name
- Generate an `.xlsx` file client-side using the `xlsx` library (SheetJS)
- Add an "Export Pending/Failed" button next to the status filter in `ManagePayments.tsx`

**Files modified**:
- `src/components/admin/ManagePayments.tsx` -- add export button and logic
- `package.json` -- add `xlsx` dependency

---

## Task 2: Fix "Add Medium" Dialog Causing Subject/Course Dialogs to Disappear

**Root cause**: In `ManageContent.tsx`, the "Add Subject" and "Upload Chapter PDF" dialogs are rendered **inside** the `<Tabs>` component (lines 488-586). The `<Tabs>` component wraps Radix UI Tabs, and when `selectedMedium` changes (triggered by `handleAddMedium` calling `setSelectedMedium`), the tab content and its child dialogs re-render. The Radix Dialog's focus management and the Tabs' value change can conflict, causing dialogs to close or fail to open properly right after a medium switch.

**Fix**: Move the "Add Subject" and "Upload Chapter PDF" `<Dialog>` components **outside** the `<Tabs>` component, similar to how the "Add Medium" dialog is already placed outside (line 837). The trigger buttons stay inside Tabs, but the actual Dialog portals are rendered at the Card level. This prevents tab re-renders from interfering with dialog state.

**Files modified**:
- `src/components/admin/ManageContent.tsx` -- restructure dialog placement

