

## Update Favicon and Fix Movatif Font

Two changes: switch the favicon to the new logo, and load the Movatif font from the online source you provided.

---

### 1. Favicon Update

The favicon currently points to `/nythic-logo.png` (the old logo). Per project memory, the new icon asset is `Icon.png`. However, I don't see an `Icon.png` file uploaded to the project yet.

**Option A (if you upload the new Icon.png):** I'll copy it to `public/` and update `index.html` to reference it.

**Option B (use the existing logo file):** If `nythic-logo.png` in `public/` has already been replaced with the new logo, I just need to confirm -- no code change needed.

**Please upload the new favicon image** (the "N book icon") so I can set it as the favicon, or confirm that `public/nythic-logo.png` is already the correct new logo.

### 2. Movatif Font -- Load from Online Source

Currently the CSS in `src/index.css` tries to load Movatif from local files in `/fonts/` which don't exist. I'll fix this by:

**`index.html`** -- Add the stylesheet link in the head:
```
<link href="https://db.onlinewebfonts.com/c/24cb75de3ea8b720dac8ebfac56aeae6?family=Movatif+W00+Regular" rel="stylesheet">
```

**`src/index.css`** -- Remove the broken local `@font-face` block for Movatif (lines 13-19) since the font will now be loaded via the external stylesheet.

**`src/components/BrandName.tsx`** -- Update the font-family reference from `'Movatif'` to `'Movatif W00 Regular'` to match the external font's registered name.

### Files Modified

- `index.html` -- add Movatif font stylesheet link, potentially update favicon path
- `src/index.css` -- remove broken local @font-face for Movatif
- `src/components/BrandName.tsx` -- update font-family name to `"Movatif W00 Regular"`
