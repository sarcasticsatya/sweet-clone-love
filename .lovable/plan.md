

## Plan: Optimize Mobile UX to Reduce Scrolling (5 scrolls to 2 scrolls)

### Problem Analysis
The current landing page takes 5+ scrolls on mobile due to:
- Hero section using 90% viewport height
- Features section: 5 full cards stacked vertically with large padding
- Subjects section: 3 large cards with floating icons and tall icon containers
- CTA section: Large padding
- All sections have `py-20` (80px top + 80px bottom padding)

### Solution: Mobile-First Compact Layout

**Goal:** Footer visible within 2 scrolls on mobile while maintaining desktop experience

---

### Changes Overview

| Section | Current Mobile Issue | Solution |
|---------|---------------------|----------|
| HeroSection | `min-h-[90vh]` too tall | Reduce to `min-h-[60vh]` on mobile |
| FeaturesSection | 5 cards stacked, large padding | Horizontal scroll carousel on mobile, reduced padding |
| SubjectsSection | 3 large cards with tall icon area | Compact inline layout, smaller icons |
| CTASection | Large padding | Reduced padding on mobile |
| Footer | Fine | Keep as-is |

---

### Detailed Changes

#### 1. HeroSection.tsx - Compact Hero on Mobile

```tsx
// Change line 22
// From: className="relative min-h-[90vh] flex items-center..."
// To: className="relative min-h-[60vh] md:min-h-[90vh] flex items-center..."

// Reduce logo size on mobile (line 35)
// From: "w-24 h-24 md:w-32 md:h-32"
// To: "w-20 h-20 md:w-32 md:h-32"

// Reduce title size on mobile (line 42)
// From: "text-5xl md:text-7xl"
// To: "text-4xl md:text-7xl"

// Reduce subtitle padding (line 54)
// From: "text-lg md:text-xl"
// To: "text-base md:text-xl"

// Remove scroll indicator on mobile (hide or move to bottom of page)
```

#### 2. FeaturesSection.tsx - Horizontal Carousel on Mobile

Transform from vertical stack to horizontal scrolling on mobile:

```tsx
// Mobile: Horizontal scroll with snap points
// Desktop: Grid layout (unchanged)

<div className="flex md:grid overflow-x-auto md:overflow-visible gap-4 md:gap-6 
               md:grid-cols-2 lg:grid-cols-3 snap-x snap-mandatory
               pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
  {features.map((feature) => (
    <Card className="min-w-[280px] md:min-w-0 snap-center flex-shrink-0 md:flex-shrink">
      // ... card content with reduced padding on mobile
    </Card>
  ))}
</div>

// Reduce section padding on mobile
// From: py-20
// To: py-10 md:py-20

// Reduce header margin
// From: mb-16
// To: mb-6 md:mb-16
```

#### 3. SubjectsSection.tsx - Compact Subject Display

```tsx
// Mobile: Compact horizontal layout with smaller icons
// Desktop: Keep current grid

// Reduce section padding
// From: py-20
// To: py-10 md:py-20

// Mobile: Single row with 3 compact subject cards
<div className="flex md:grid justify-center gap-4 md:gap-8 md:grid-cols-3">
  {subjects.map((subject) => (
    <div className="w-[100px] md:w-auto group">
      {/* Mobile: Single icon, no floating animation */}
      <div className="relative h-16 md:h-32 mb-2 md:mb-6 flex justify-center">
        {/* Only show first icon on mobile */}
        <div className="md:absolute md:animate-float">
          <Icon />
        </div>
      </div>
      {/* Smaller text on mobile */}
      <h3 className="text-sm md:text-2xl">{subject.name}</h3>
    </div>
  ))}
</div>

// Reduce or hide the "Additional info" text on mobile
// From: mt-16
// To: mt-6 md:mt-16
```

#### 4. CTASection.tsx - Compact CTA

```tsx
// Reduce padding
// From: py-20
// To: py-10 md:py-20

// Reduce button padding
// From: py-7
// To: py-5 md:py-7

// Make support section more compact
// From: pt-8 mt-8
// To: pt-4 mt-4 md:pt-8 md:mt-8
```

---

### Visual Comparison (Mobile)

```text
BEFORE (5 scrolls)          AFTER (2 scrolls)
┌─────────────────┐         ┌─────────────────┐
│                 │         │  Logo + Title   │
│   HERO (90vh)   │ ────►   │  CTA buttons    │ 60vh
│                 │         │                 │
└─────────────────┘         ├─────────────────┤
     [SCROLL 1]             │  Features ←→    │ horizontal
┌─────────────────┐         │  [carousel]     │ scroll
│  Feature 1      │         ├─────────────────┤
│  Feature 2      │ ────►   │ Sci Math Social │ compact
│  Feature 3      │         │   🧪   📐   🌍  │ row
│  Feature 4      │         ├─────────────────┤
│  Feature 5      │         │  Get Started    │
└─────────────────┘         │  📞 Support     │
  [SCROLL 2,3,4]            ├─────────────────┤
┌─────────────────┐         │ Footer + AIWOS  │
│  Subject cards  │ ────►   └─────────────────┘
│  CTA + Footer   │              [SCROLL 2]
└─────────────────┘
   [SCROLL 5]
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/HeroSection.tsx` | Reduce height, sizes, spacing on mobile |
| `src/components/landing/FeaturesSection.tsx` | Horizontal carousel on mobile |
| `src/components/landing/SubjectsSection.tsx` | Compact inline layout on mobile |
| `src/components/landing/CTASection.tsx` | Reduce padding on mobile |

---

### Key Mobile Optimizations

1. **Hero**: 60vh instead of 90vh, smaller logo/text
2. **Features**: Horizontal swipeable carousel (saves ~2 scrolls)
3. **Subjects**: Compact row layout (saves ~1 scroll)
4. **CTA**: Reduced padding
5. **All sections**: `py-10 md:py-20` pattern for mobile vs desktop

### Preserved Experience
- Desktop layout remains unchanged
- All animations still work
- All content is still accessible
- "Developed by AIWOS" footer remains visible

