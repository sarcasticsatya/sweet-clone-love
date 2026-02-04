

## Plan: Add Auto-Play to Features Carousel

### Overview

Add auto-play functionality to the mobile features carousel so that cards automatically rotate every 4 seconds, providing a more engaging experience without requiring manual interaction.

---

### Implementation

**File:** `src/components/landing/FeaturesSection.tsx`

**Changes:**

1. **Install Autoplay Plugin**: Embla Carousel has an official autoplay plugin (`embla-carousel-autoplay`) that integrates seamlessly with the existing carousel setup.

2. **Import and Configure Autoplay**: Add the autoplay plugin with a 4-second delay and stop-on-interaction behavior.

```tsx
import Autoplay from "embla-carousel-autoplay";

// In the Carousel component:
<Carousel 
  opts={{ align: "start", loop: true }} 
  plugins={[
    Autoplay({
      delay: 4000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  ]}
  className="w-full"
>
```

---

### Technical Details

| Setting | Value | Purpose |
|---------|-------|---------|
| `delay` | 4000ms (4 seconds) | Time between auto-rotations |
| `stopOnInteraction` | true | Stops auto-play when user manually navigates |
| `stopOnMouseEnter` | true | Pauses when user hovers (touch devices: on touch) |
| `loop` | true (already set) | Enables infinite rotation |

---

### Dependency

The `embla-carousel-autoplay` package needs to be installed. It's the official autoplay plugin for Embla Carousel (already using `embla-carousel-react`).

```bash
npm install embla-carousel-autoplay
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/FeaturesSection.tsx` | Add autoplay plugin import and configuration |
| `package.json` | Add `embla-carousel-autoplay` dependency |

---

### Expected Behavior

1. On mobile, the features carousel auto-rotates every 4 seconds
2. If user clicks the arrow buttons or swipes manually, auto-play stops
3. Smooth, continuous rotation showcasing all 5 features
4. Desktop grid layout remains unchanged (no auto-play needed)

