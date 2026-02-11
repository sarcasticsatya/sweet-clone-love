

## Fix: Receipt Amount Formatting

### Problem
jsPDF's default Helvetica font does not include the Unicode Rupee symbol (`₹`, U+20B9). When the PDF is generated, this character renders as garbled/gibberish text instead of the currency symbol.

### Solution
Replace all instances of the `₹` symbol with `Rs.` in `src/lib/generateReceipt.ts`. This is universally supported by the built-in Helvetica font and is the standard Indian Rupee abbreviation.

### Changes

**`src/lib/generateReceipt.ts`** -- 5 lines updated:
- Line 72: Table amount column -- `₹${...}` to `Rs. ${...}`
- Line 108: Subtotal line -- same change
- Line 114: Discount line -- `-₹${...}` to `-Rs. ${...}`
- Line 126: Total Paid line -- same change

No other files affected. No database changes.

