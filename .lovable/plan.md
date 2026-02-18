
## Root Cause: Platform Strips the Entire `<head>` on Deployment

The live page source at `nythicai.com` shows the entire `<head>` section is missing — the platform replaces it with its own injected head that includes the Lovable favicon. No matter what is put in `index.html`'s `<head>`, it gets overridden at the CDN level after publishing.

The only reliable fix is to **force-set the favicon via JavaScript** inside the React app itself. This runs after the DOM is loaded and after any platform injection, giving it the last word.

---

## Fix: JavaScript Favicon Override in `src/main.tsx`

Add a small self-executing snippet at the top of `src/main.tsx` that:

1. Removes all existing `<link rel="icon">` and `<link rel="shortcut icon">` elements from the DOM
2. Creates and appends fresh `<link>` elements pointing to `/nythic-logo.png` with a high cache-buster version

```typescript
// Force favicon override — runs after any platform head injection
const setFavicon = () => {
  // Remove all existing favicon links
  document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());

  // Set Nythic favicon
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.href = "/nythic-logo.png?v=3";
  document.head.appendChild(icon);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.type = "image/png";
  shortcut.href = "/nythic-logo.png?v=3";
  document.head.appendChild(shortcut);

  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.href = "/nythic-logo.png?v=3";
  document.head.appendChild(apple);
};

setFavicon();
```

This code runs synchronously before React renders, ensuring it fires as early as possible in the JS execution cycle — after the platform's HTML injection but before the user sees anything.

---

## Files to Change

- **`src/main.tsx`**: Add the `setFavicon()` call at the very top, before the `ReactDOM.createRoot` call.
- **`index.html`**: Bump the cache-buster from `?v=2` to `?v=3` to also bust cached favicons in browsers that did parse the head correctly.

---

## Why This Works

| Method | Status |
|--------|--------|
| `index.html` `<link rel="icon">` | Gets stripped by platform CDN |
| JS override in `main.tsx` | Runs after platform injection, wins |

The JavaScript approach is the standard workaround for hosted platforms that inject their own head content. It is used widely for exactly this scenario.
