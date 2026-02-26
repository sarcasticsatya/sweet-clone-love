

## Fix: ಇಂಗ್ಲೀಷ (English) Subject in Kannada Medium — Wrong Language Content

### Root Cause

Two separate issues are causing English subject content to generate in Kannada:

**Issue 1 — Stale cached data**: Quizzes (2), flashcards (40), mindmaps (1), and infographics (2) are all cached in Kannada from before the language detection fix. These must be deleted to force regeneration.

**Issue 2 — Missing English detection in 2 edge functions**: The `generate-mindmap` and `generate-infographic` functions are missing the check for `"ಇಂಗ್ಲೀಷ"` in their `detectLanguage` function. The subject name "ಇಂಗ್ಲೀಷ" doesn't match "kannada"/"ಕನ್ನಡ" or "hindi"/"ಹಿಂದಿ", and since medium is "Kannada" (not "English"), it falls to the default `return "kannada"`.

The `generate-quiz` and `generate-flashcards` functions already have this fix, but `generate-mindmap` and `generate-infographic` do not.

### Changes

#### 1. Delete all stale cached content for ಇಂಗ್ಲೀಷ subject

Delete all wrongly-cached content (subject ID: `9a7cae61-6e23-4e98-abab-5749f88f4e24`):
- 2 quizzes in Kannada
- 40 flashcards in Kannada
- 1 mindmap in Kannada
- 2 infographics in Kannada

#### 2. Fix `generate-mindmap/index.ts` — add English subject detection

Add a check for English subjects before the medium-based fallback in the `detectLanguage` function:

```text
Current order: Kannada check -> Hindi check -> English medium check -> default Kannada
Fixed order:   Kannada check -> Hindi check -> English subject check -> English medium check -> default Kannada
```

Add after the Hindi check (around line 30):
```typescript
// English subject in ANY medium -> English (handles "ಇಂಗ್ಲೀಷ" in Kannada medium)
if (normalizedSubject.includes("english") || subjectName.includes("ಇಂಗ್ಲೀಷ")) {
  console.log("Result: english (English subject - subject name takes priority)");
  return "english";
}
```

#### 3. Fix `generate-infographic/index.ts` — same English subject detection

Add the identical check in the infographic function's `detectLanguage` (around line 27):
```typescript
// English subject in ANY medium -> English (handles "ಇಂಗ್ಲೀಷ" in Kannada medium)
if (normalizedSubject.includes("english") || subjectName.includes("ಇಂಗ್ಲೀಷ")) {
  console.log("Result: english (English subject - subject name takes priority)");
  return "english";
}
```

#### 4. Deploy updated edge functions

Deploy `generate-mindmap` and `generate-infographic` after the code fix.

### Summary

| Component | Problem | Fix |
|-----------|---------|-----|
| Quizzes | 2 cached in Kannada | Delete cache (code already correct) |
| Flashcards | 40 cached in Kannada | Delete cache (code already correct) |
| Mindmap | 1 cached in Kannada + missing detection | Delete cache + add "ಇಂಗ್ಲೀಷ" check |
| Infographic | 2 cached in Kannada + missing detection | Delete cache + add "ಇಂಗ್ಲೀಷ" check |
| Chat | Already bilingual (English + Kannada) | No change needed |

