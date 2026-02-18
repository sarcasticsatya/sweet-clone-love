
## Fix Favicon Showing Lovable Icon on Deployed Site

### Root Cause

The `index.html` already correctly references `/nythic-logo.png`, but the Lovable hosting platform injects its own `<link rel="icon">` tag into the published page's HTML. Browsers use the **last** favicon `<link>` tag they encounter, so the platform's injected one (which comes later) wins.

### Fix Strategy

Three changes to `index.html` to ensure the Nythic AI logo always wins:

1. Add `<link rel="shortcut icon">` alongside the existing `<link rel="icon">` — older browser fallback that also helps prevent overrides.
2. Add a `?v=2` cache-buster to both favicon links so browsers discard any previously cached Lovable favicon.
3. Move both favicon link tags to be the **very first** things inside `<head>`, before the GTM and Meta Pixel scripts — so they are declared before any platform injection has a chance to run.

### File: `index.html`

**Move and update** the favicon lines to the very top of `<head>` (line 3, before GTM):

```html
<head>
  <link rel="icon" type="image/png" href="/nythic-logo.png?v=2" />
  <link rel="shortcut icon" type="image/png" href="/nythic-logo.png?v=2" />
  <link rel="apple-touch-icon" href="/nythic-logo.png?v=2" />
  <!-- Google Tag Manager ... -->
```

This is the only file that needs changing. No Lovable references exist in any user-facing files — the `lovable-tagger` and `ai.gateway.lovable.dev` occurrences are internal build tools and backend AI gateway calls that are never visible to students or in the page source.

### Technical Details

- The `lovable-tagger` in `vite.config.ts` is a dev-only build tool plugin, it does not inject anything into the page source.
- The `ai.gateway.lovable.dev` calls in edge functions are server-side only, invisible to the browser.
- The `LOVABLE_API_KEY` references are backend secrets, never exposed to users.
- Only `index.html` needs updating — the favicon placement fix is the correct solution.
