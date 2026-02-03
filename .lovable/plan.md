

## Plan: Update Refund Policy Content

### Problem
The RefundPolicy.tsx file keeps reverting to old content after refresh. This appears to be a caching or sync issue in the editor.

### Solution
I will update the file with exactly the 4 policy items you specified:

1. **Cancellations within 7 days** of placing order
2. **Product not as expected** - notify within 4 days
3. **Warranty complaints** - refer to manufacturers  
4. **Refunds processed in 4 days** - credited to original payment mode

### Changes to Make

**File:** `src/pages/RefundPolicy.tsx`

**Current state:** 6 list items with outdated timeframes (3 days cancellation, 7 days for various items)

**New state:** 4 list items with your specified timeframes:

```tsx
<ol className="list-decimal list-outside ml-6 space-y-4">
  <li>
    Cancellations will only be considered if the request is made within <strong>7 days</strong> of placing the order.
  </li>

  <li>
    In case you feel that the product received is not as shown on the site or as per your expectations,
    you must bring it to the notice of our customer service within <strong>4 days</strong> of receiving the product. The
    customer service team after looking into your complaint will take an appropriate decision.
  </li>

  <li>
    In case of complaints regarding the products that come with a warranty from the manufacturers,
    please refer the issue to them.
  </li>

  <li>
    In case of any refunds approved by NythicAI, it will take <strong>4 days</strong> for the refund to be processed to
    you, the amount will be credited to your original payment mode.
  </li>
</ol>
```

### Items Removed
- The shipping/delivery cancellation clause  
- The empty `<li></li>` element (line 18-19)
- The damaged/defective items clause (7 days reporting)

### Items Updated
- Cancellation window: 3 days → **7 days**
- Product mismatch reporting: 7 days → **4 days**
- Refund processing: Added "the amount will be credited to your original payment mode"

### Contact Section
Will remain unchanged with:
- Phone: +91 82773 23208
- Time: Monday - Friday (9:00 - 18:00)
- Address: 17-18 2nd floor Maruti Complex Line bazar Dharwad 580001

