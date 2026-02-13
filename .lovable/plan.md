

## 1. Add Google Analytics (gtag)

Insert the provided Google Analytics tracking snippet into `index.html` inside the `<head>` tag. This includes:
- The async gtag.js script loader
- The dataLayer initialization and `gtag('config', 'G-6CKSHE9QKE')` call

**File:** `index.html`

---

## 2. Expand Subjects Section to All 6 Subjects

Currently the landing page only shows Science, Mathematics, and Social Science. We'll expand it to include all 6 SSLC subjects with unique colors, icons, and animations.

### New subjects list:

| Subject | Kannada | Color Gradient | Icon |
|---------|---------|---------------|------|
| Science | ವಿಜ್ಞಾನ | blue to cyan | Atom |
| Mathematics | ಗಣಿತ | purple to pink | Calculator |
| Social Science | ಸಮಾಜ ವಿಜ್ಞಾನ | green to emerald | Globe |
| Kannada | ಕನ್ನಡ | orange to amber | BookOpen |
| English | ಇಂಗ್ಲೀಷ | rose to red | Languages |
| Hindi | ಹಿಂದಿ | teal to cyan | Type |

### Layout changes:
- **Desktop**: 3x2 grid (3 columns, 2 rows) with staggered fade-in-up animations
- **Mobile**: 3x2 compact grid (3 per row) instead of the current 3-in-a-row layout, keeping the compact card style
- Update section subtitle from "All three core subjects" to "All six SSLC subjects"
- Each card gets a staggered animation delay for a wave-like entrance effect

### Animations:
- Each card uses `animate-fade-in-up` with incremental delays (0s, 0.1s, 0.2s, 0.3s, 0.4s, 0.5s)
- Floating icons on desktop preserved for all 6 subjects
- Hover effects (scale, glow, gradient overlay) maintained

**File:** `src/components/landing/SubjectsSection.tsx`

---

### Technical Details

**`index.html`** -- Add gtag snippet in `<head>` before `<title>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6CKSHE9QKE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-6CKSHE9QKE');
</script>
```

**`src/components/landing/SubjectsSection.tsx`**:
- Add 3 new subject entries (Kannada, English, Hindi) with distinct colors and icons
- Change grid from `md:grid-cols-3` to keep `md:grid-cols-3` but now with 2 rows
- On mobile, switch from `flex` to `grid grid-cols-3` for a neat 3x2 layout
- Each subject card uses a single representative icon (no triple floating icons needed for the language subjects -- keeps it clean)
