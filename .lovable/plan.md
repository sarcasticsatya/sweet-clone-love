

## Plan: Fix Mobile Footer Links & Features Carousel

### Problems Identified

1. **Footer Policy Links Too Big on Mobile**: The links "Terms & Conditions", "Privacy Policy", "Refund Policy" with icons are displayed in a single row with `gap-6` and `text-sm`, causing them to be too large and potentially wrapping awkwardly on mobile.

2. **Features Section Horizontal Scroll is Wasteful**: The current implementation uses native horizontal scroll (`overflow-x-auto`) which:
   - Requires users to manually swipe/scroll
   - Doesn't show navigation affordance (no arrows)
   - Content is bleeding out of the container (`-mx-4 px-4`)

---

### Solution Overview

| Issue | Fix |
|-------|-----|
| Footer links too big | Make them smaller on mobile, stack vertically, remove icons on mobile |
| Features horizontal scroll | Replace with Embla Carousel with left/right arrow buttons |

---

### Part 1: Footer Mobile Optimization

**File:** `src/components/Footer.tsx`

**Changes:**
- Hide icons on mobile (shown only on `md:` and above)
- Reduce text size on mobile: `text-xs md:text-sm`
- Reduce gap on mobile: `gap-3 md:gap-6`
- Shorten link text on mobile (e.g., "Terms" instead of "Terms & Conditions")

```tsx
// Mobile-optimized footer links
<div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm">
  <Link to="/terms-and-conditions" className="...">
    <FileText className="w-4 h-4 hidden md:block" />
    <span className="md:hidden">Terms</span>
    <span className="hidden md:inline">Terms & Conditions</span>
  </Link>
  <Link to="/privacy-policy" className="...">
    <Shield className="w-4 h-4 hidden md:block" />
    <span className="md:hidden">Privacy</span>
    <span className="hidden md:inline">Privacy Policy</span>
  </Link>
  <Link to="/refund-policy" className="...">
    <RefreshCw className="w-4 h-4 hidden md:block" />
    <span className="md:hidden">Refund</span>
    <span className="hidden md:inline">Refund Policy</span>
  </Link>
</div>
```

---

### Part 2: Features Section with Carousel & Arrows

**File:** `src/components/landing/FeaturesSection.tsx`

**Changes:**
- Replace manual `overflow-x-auto` scroll with Embla Carousel component
- Add left/right arrow buttons for navigation (visible on mobile)
- Keep grid layout on desktop (no carousel needed)
- Fix content bleeding by removing the `-mx-4 px-4` hack
- Show 1 card at a time on mobile with proper carousel behavior

**New Structure:**

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

// Mobile: Carousel with arrows
// Desktop: Grid layout

{/* Mobile Carousel */}
<div className="md:hidden">
  <Carousel opts={{ align: "start", loop: true }} className="w-full">
    <CarouselContent className="-ml-2">
      {features.map((feature) => (
        <CarouselItem key={feature.title} className="pl-2 basis-[85%]">
          <Card>...</Card>
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious className="left-0" />
    <CarouselNext className="right-0" />
  </Carousel>
</div>

{/* Desktop Grid - unchanged */}
<div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {features.map((feature) => (
    <Card>...</Card>
  ))}
</div>
```

**Arrow Positioning:**
- Position arrows inside the container (not outside with `-left-12`)
- Use `left-2` and `right-2` for mobile-friendly placement
- Semi-transparent background for visibility

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Footer.tsx` | Smaller text, shorter labels, hide icons on mobile |
| `src/components/landing/FeaturesSection.tsx` | Use Embla Carousel with arrow buttons on mobile |

---

### Technical Details

#### Carousel Configuration
```tsx
opts={{
  align: "start",    // Align cards to start
  loop: true,        // Allow infinite scrolling
}}
```

#### Card Sizing
- `basis-[85%]` on mobile: Shows most of current card with peek of next
- Full width cards would feel cramped; this gives visual cue that more exist

#### Arrow Button Styling
```tsx
<CarouselPrevious className="left-2 bg-background/80 hover:bg-background" />
<CarouselNext className="right-2 bg-background/80 hover:bg-background" />
```

---

### Expected Result

**Footer (Mobile):**
```
Terms  •  Privacy  •  Refund
© 2025 NythicAI
Developed by AIWOS
```

**Features Section (Mobile):**
```
┌─────────────────────────────┐
│  ←  [Feature Card]      →   │
│      visible arrows         │
│      at edges               │
└─────────────────────────────┘
```

- Clean, non-bleeding layout
- Intuitive left/right arrows
- No content overflow issues
- All content preserved

