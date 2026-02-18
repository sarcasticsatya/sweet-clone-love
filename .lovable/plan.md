
## Add Google Tag Manager + Meta Pixel to index.html

Three tracking snippets need to be placed in the correct locations per their official specifications:

### 1. Google Tag Manager (Head script)
- Placement: **`<head>` — as high as possible**, right after the opening `<head>` tag (before everything else)
- The GTM ID is `GTM-WN2TK848`

### 2. Google Tag Manager (Body noscript)
- Placement: **`<body>` — immediately after the opening `<body>` tag**
- This is the fallback `<noscript><iframe>` for browsers with JavaScript disabled

### 3. Meta Pixel (Head script)
- Placement: **`<head>`** — after the GTM head script
- Pixel ID is `1274541831196352`
- Includes both the `<script>` and the `<noscript><img>` fallback — the noscript goes **after `<body>` open** alongside the GTM noscript

---

### File: `index.html`

**In `<head>`** (right at the top, before existing tags):
- GTM head script
- Meta Pixel script

**In `<body>`** (immediately after `<body>` tag):
- GTM noscript iframe
- Meta Pixel noscript img

The existing GA4 (`gtag.js`, `G-6CKSHE9QKE`) snippet that's already in the head stays as-is — GTM doesn't replace it, they coexist.

### Summary of final `index.html` structure:

```
<head>
  <!-- GTM head script (NEW) -->
  <!-- Meta Pixel script (NEW) -->
  <!-- existing: charset, viewport, icons, font, GA4 gtag, title, meta -->
</head>
<body>
  <!-- GTM noscript iframe (NEW) -->
  <!-- Meta Pixel noscript img (NEW) -->
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

Only `index.html` needs to be changed.
