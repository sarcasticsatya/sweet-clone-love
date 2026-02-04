

## Plan: Compact Mobile Layout for Index Page

### Current Problem
The Index page has excessive vertical spacing on mobile, requiring 5+ scrolls to see the footer. The current layout uses:
- Large logo (80x80px)
- Large text sizes (5xl title, 3xl subtitle)
- `space-y-8` (32px) between all sections
- `p-8` (32px) padding
- Separate bordered sections for support and policies

### Solution: Mobile-Optimized Compact Layout

Create a responsive design that fits within 2 scrolls on mobile while maintaining the desktop appearance.

---

### Changes to `src/pages/Index.tsx`

#### 1. **Use Mobile Detection Hook**
Import `useIsMobile` to conditionally apply compact styles:
```tsx
import { useIsMobile } from "@/hooks/use-mobile";
```

#### 2. **Compact Logo on Mobile**
- Desktop: 80x80px (`w-20 h-20`)
- Mobile: 56x56px (`w-14 h-14`)

#### 3. **Reduce Text Sizes on Mobile**
| Element | Desktop | Mobile |
|---------|---------|--------|
| Title "NythicAI" | `text-5xl` | `text-3xl` |
| Subtitle "EdTech..." | `text-3xl` | `text-xl` |
| Description | `text-lg` | `text-sm` |

#### 4. **Reduce Spacing on Mobile**
| Spacing | Desktop | Mobile |
|---------|---------|--------|
| Main container | `space-y-8 p-8` | `space-y-4 p-4` |
| Section gaps | `space-y-4` | `space-y-2` |
| Border padding | `pt-6` | `pt-3` |

#### 5. **Consolidate Footer Sections**
Merge "Contact Support" and "Policy Links" into a single compact footer on mobile:
- Remove duplicate MessageCircle icon
- Inline the phone number with copy button
- Horizontal policy links in a single row
- Copyright on same line as policies

#### 6. **Hide Description on Mobile**
The long description paragraph can be hidden on mobile to save space since the tagline "Your 24x7 Personal Teacher" already conveys the value.

---

### Visual Comparison

**Before (Mobile - 5 scrolls):**
```
┌─────────────────────┐
│                     │
│      [Logo]         │  ← Large 80px
│                     │
│     NythicAI        │  ← 5xl (48px)
│   Your 24x7...      │
│   EdTech Learning   │  ← 3xl (30px)
│      Platform       │
│                     │
│  AI-powered...      │  ← Long description
│  SSLC students...   │
│                     │  ← 32px gap
├─────────────────────┤
│  [Get Started →]    │  
│                     │  ← 32px gap
├─────────────────────┤
│  Contact Support    │
│  📞 +91 827... [📋] │
│                     │  ← 32px gap
├─────────────────────┤
│  Terms | Privacy    │
│  Refund Policy      │
│  © 2025 NythicAI    │
└─────────────────────┘
```

**After (Mobile - 2 scrolls):**
```
┌─────────────────────┐
│    [Logo 56px]      │
│                     │
│     NythicAI        │  ← 3xl (30px)
│   Your 24x7...      │
│  EdTech Platform    │  ← xl (20px)
│                     │
│  [Get Started →]    │
│                     │
├─────────────────────┤
│ 📞 +91 827... [📋]  │  ← Compact inline
│ Terms • Privacy     │  ← Single row
│ Refund • © 2025     │
└─────────────────────┘
```

---

### Implementation Details

```tsx
const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // ... existing useEffect logic ...
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className={cn(
        "max-w-2xl text-center",
        isMobile ? "space-y-4 p-4" : "space-y-8 p-8"
      )}>
        {/* Logo - smaller on mobile */}
        <div className="flex justify-center">
          <div className={cn(
            "bg-primary rounded-2xl flex items-center justify-center",
            isMobile ? "w-14 h-14 p-1.5" : "w-20 h-20 p-2"
          )}>
            <Logo size={isMobile ? "md" : "lg"} />
          </div>
        </div>
        
        {/* Title Section - compact on mobile */}
        <div className={isMobile ? "space-y-1" : "space-y-4"}>
          <h1 className={cn(
            "font-bold tracking-tight",
            isMobile ? "text-3xl" : "text-5xl"
          )}>NythicAI</h1>
          <p className="text-sm text-primary font-medium">Your 24x7 Personal Teacher</p>
          <h2 className={cn(
            "font-semibold text-muted-foreground",
            isMobile ? "text-xl" : "text-3xl"
          )}>EdTech Learning Platform</h2>
          
          {/* Hide long description on mobile */}
          {!isMobile && (
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              AI-powered learning platform for SSLC students...
            </p>
          )}
        </div>

        {/* CTA Button */}
        <div className="flex gap-4 justify-center">
          <Button size={isMobile ? "default" : "lg"} onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* Compact Footer on Mobile */}
        <div className={cn(
          "border-t border-border",
          isMobile ? "pt-3 space-y-2" : "pt-6 space-y-6"
        )}>
          {/* Support - inline on mobile */}
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">+91 82773 23208</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={...}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {/* Policies - compact row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link to="/terms-and-conditions">Terms</Link>
            <span>•</span>
            <Link to="/privacy-policy">Privacy</Link>
            <span>•</span>
            <Link to="/refund-policy">Refund</Link>
          </div>
          
          <p className="text-xs text-muted-foreground">© 2025 NythicAI</p>
        </div>
      </div>
    </div>
  );
};
```

---

### Technical Summary

| Change | File |
|--------|------|
| Import `useIsMobile` hook | `src/pages/Index.tsx` |
| Import `cn` utility | `src/pages/Index.tsx` |
| Responsive logo size | Lines 34-38 |
| Responsive text sizes | Lines 40-47 |
| Hide description on mobile | Line 46 |
| Compact footer spacing | Lines 56-91 |
| Simplified policy links text | Lines 76-88 |

### Outcome
- Mobile: Content fits in **~2 scrolls** (logo → button → footer visible quickly)
- Desktop: **No visual changes** - maintains current spacious layout

