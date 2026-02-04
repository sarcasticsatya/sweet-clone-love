
## Plan: Make Theme Consistent Across All Pages

### Overview

The Index page uses a consistent design system with Tailwind theme tokens (e.g., `bg-background`, `text-foreground`, `text-primary`). Several pages need updates to follow this same pattern.

---

### Issues Identified

| Page | Issue |
|------|-------|
| NotFound.tsx | Uses hardcoded colors (gray-100, gray-600, blue-500) instead of theme tokens. Missing logo, branding, and footer. |
| UpdatePassword.tsx | Uses BookOpen icon instead of Logo component |
| VerifyEmail.tsx | Uses BookOpen icon instead of Logo component |
| UserProfile.tsx | Missing footer component |
| AdminDashboard.tsx | Missing footer component |

---

### Changes Summary

#### 1. NotFound.tsx - Complete Redesign

**Current (inconsistent):**
```tsx
<div className="flex min-h-screen items-center justify-center bg-gray-100">
  <h1 className="text-4xl font-bold">404</h1>
  <p className="text-xl text-gray-600">Oops! Page not found</p>
  <a href="/" className="text-blue-500">Return to Home</a>
</div>
```

**Updated (themed):**
```tsx
<div className="min-h-screen flex flex-col bg-background">
  <div className="flex-1 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-primary rounded-lg flex items-center justify-center p-1">
          <Logo size="md" />
        </div>
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </CardContent>
    </Card>
  </div>
  <Footer minimal />
</div>
```

**Theme tokens applied:**
- `bg-background` instead of `bg-gray-100`
- `text-muted-foreground` instead of `text-gray-600`
- Button with `text-primary` styling instead of raw blue colors
- Added Logo component, Card wrapper, and Footer

---

#### 2. UpdatePassword.tsx - Replace BookOpen with Logo

**Line 114:**
```tsx
// Current:
<BookOpen className="w-6 h-6 text-primary-foreground" />

// Updated:
<Logo size="md" />
```

Same styling pattern as Auth.tsx and ResetPassword.tsx pages.

---

#### 3. VerifyEmail.tsx - Replace BookOpen with Logo

**Lines 59-62:**
```tsx
// Current:
<BookOpen className="w-6 h-6 text-primary-foreground" />

// Updated:
<Logo size="md" />
```

Requires importing the Logo component.

---

#### 4. UserProfile.tsx - Add Footer

Add the minimal footer at the bottom of the page:

```tsx
// After closing </div> of container
<Footer minimal />
```

Wrap content in a flex container to push footer to bottom.

---

#### 5. AdminDashboard.tsx - Add Footer

Add the minimal footer at the bottom:

```tsx
// After closing </div> of main content
<Footer minimal />
```

Update container to use flex layout for proper footer positioning.

---

### Files to Modify

| File | Changes |
|------|---------|
| src/pages/NotFound.tsx | Complete redesign with theme tokens, Logo, Card, Button, Footer |
| src/pages/UpdatePassword.tsx | Replace BookOpen icon with Logo component |
| src/pages/VerifyEmail.tsx | Replace BookOpen icon with Logo component |
| src/pages/UserProfile.tsx | Add Footer component and adjust layout |
| src/pages/AdminDashboard.tsx | Add Footer component and adjust layout |

---

### Technical Details

**Imports to add:**

NotFound.tsx:
```tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
```

VerifyEmail.tsx:
```tsx
import { Logo } from "@/components/Logo";
```

UserProfile.tsx:
```tsx
import { Footer } from "@/components/Footer";
```

AdminDashboard.tsx:
```tsx
import { Footer } from "@/components/Footer";
```

---

### Visual Consistency After Changes

All pages will share:
- `bg-background` as base background
- `bg-muted/30` for form pages (Auth, Reset, Verify, etc.)
- `bg-card` for card surfaces
- `text-foreground` for headings
- `text-muted-foreground` for secondary text
- `text-primary` for links and accents
- Consistent Logo component in headers
- Footer component on all standalone pages (dashboards use minimal footer)

---

### Note on StudentDashboard

The StudentDashboard intentionally lacks a footer because it uses a full-screen three-panel layout that maximizes content area. Adding a footer would break the carefully designed UX. This is consistent with the NotebookLM design pattern it follows.
