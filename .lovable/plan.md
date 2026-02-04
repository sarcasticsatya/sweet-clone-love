

## Plan: Add "I Agree to Terms & Conditions" Checkbox with Popup Reader

### Overview

Add a mandatory Terms & Conditions agreement step to the student signup form. Users must check a checkbox that says "I agree to T&C" with a clickable link that opens the full T&C content in a dialog/popup. They can read the terms and click "Accept" to close. The signup button will be disabled until they accept the T&C.

---

### Implementation Details

#### 1. New State Variables

Add to the Auth.tsx component:

```tsx
const [agreedToTerms, setAgreedToTerms] = useState(false);
const [showTermsDialog, setShowTermsDialog] = useState(false);
```

#### 2. T&C Checkbox Component

Place this after the password field, before the "Create Account" button:

```tsx
{/* Terms & Conditions Agreement */}
<div className="flex items-start gap-2">
  <Checkbox 
    id="terms" 
    checked={agreedToTerms}
    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
    className="mt-0.5"
  />
  <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
    I agree to the{" "}
    <button 
      type="button"
      onClick={() => setShowTermsDialog(true)}
      className="text-primary underline hover:no-underline"
    >
      Terms & Conditions
    </button>
  </Label>
</div>
```

#### 3. Terms Dialog Popup

A scrollable dialog containing the full T&C content:

```tsx
<Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
    <DialogHeader>
      <DialogTitle>Terms & Conditions</DialogTitle>
      <DialogDescription>Please read carefully before accepting</DialogDescription>
    </DialogHeader>
    
    <ScrollArea className="flex-1 pr-4">
      {/* Full T&C content from TermsAndConditions page */}
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>This document is an electronic record...</p>
        {/* ... all T&C paragraphs and list items ... */}
      </div>
    </ScrollArea>
    
    <DialogFooter className="mt-4 pt-4 border-t">
      <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
        Close
      </Button>
      <Button onClick={() => {
        setAgreedToTerms(true);
        setShowTermsDialog(false);
      }}>
        Accept Terms
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 4. Disable Signup Button

Modify the Create Account button to require T&C agreement:

```tsx
<Button 
  type="submit" 
  className="w-full" 
  disabled={loading || !agreedToTerms}
>
  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
  {loading ? "Creating account..." : "Create Account"}
</Button>
```

#### 5. Validation Update

Add T&C check to form validation:

```tsx
// In handleSignUp, before other validation
if (!agreedToTerms) {
  toast.error("Please accept the Terms & Conditions to continue");
  setLoading(false);
  return;
}
```

---

### Visual Layout (Mobile-Friendly)

```text
┌─────────────────────────────────────┐
│  ... other form fields ...          │
│                                     │
│  Password: [**********]             │
│                                     │
│  ☐ I agree to the Terms & Conditions│
│                     ^^^^^ clickable │
│                                     │
│  [Create Account] ← disabled if     │
│                     unchecked       │
└─────────────────────────────────────┘
```

**When "Terms & Conditions" is clicked:**

```text
┌─────────────────────────────────────┐
│  Terms & Conditions            [X]  │
│  Please read carefully              │
├─────────────────────────────────────┤
│                                     │
│  This document is an electronic     │
│  record in terms of Information     │
│  Technology Act, 2000...            │
│                                     │
│  ... scrollable content ...         │
│                                     │
│  14. All concerns or communications │
│      relating to these Terms...     │
│                                     │
├─────────────────────────────────────┤
│           [Close]  [Accept Terms]   │
└─────────────────────────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add checkbox, dialog, state, validation |

### New Imports Required

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
```

---

### Technical Details

1. **Checkbox Component**: Uses the existing Radix UI Checkbox from `@/components/ui/checkbox`

2. **Dialog Component**: Uses existing Radix UI Dialog for the popup modal

3. **ScrollArea**: Ensures the T&C content is scrollable on mobile and desktop

4. **T&C Content**: Extracted directly from `TermsAndConditions.tsx` and placed inline in the dialog (no navigation needed)

5. **Button States**:
   - "Accept Terms" in dialog: Sets `agreedToTerms = true` and closes dialog
   - "Close" in dialog: Just closes without accepting
   - "Create Account": Only enabled when `agreedToTerms === true`

6. **Accessibility**:
   - Checkbox has associated label
   - Dialog has proper title and description
   - Focus management handled by Radix UI

---

### User Flow

1. User fills out signup form
2. User sees checkbox "I agree to the Terms & Conditions"
3. User clicks "Terms & Conditions" link
4. Dialog opens with full T&C content (scrollable)
5. User reads (or scrolls) and clicks "Accept Terms"
6. Dialog closes, checkbox is now checked
7. "Create Account" button becomes enabled
8. User submits form

**Alternative Flow:**
- User can manually check the checkbox without reading
- User can click "Close" to dismiss dialog without accepting

