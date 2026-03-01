

## Fix: Chat Language Detection for ಇಂಗ್ಲೀಷ (English) Subject in Kannada Medium

### Problem
The `chat-with-chapter` edge function still uses string-literal `.includes("ಇಂಗ್ಲೀಷ")` for detecting the English subject in Kannada medium. Due to Unicode normalization differences (composed vs decomposed Kannada characters), this check silently fails, causing the function to fall through to `"kannada_only"` instead of `"english_kannada"`.

Evidence from logs:
```
SUBJECT: ಇಂಗ್ಲೀಷ MEDIUM: Kannada RESPONSE_LANGUAGE: kannada_only
```

This is why asking "Give me one question" in an English chapter returns a Kannada summary instead.

### Root Cause
The same Unicode mismatch bug that was fixed in `generate-flashcards`, `generate-quiz`, `generate-mindmap`, and `generate-infographic` (v3 codepoint fix) was **never applied** to `chat-with-chapter`.

### Solution

1. **Update `chat-with-chapter/index.ts`** -- Replace the `getResponseLanguages` function's string-literal Kannada checks with codepoint-based detection (matching the v3 pattern already used in the other 4 functions):

```typescript
function getResponseLanguages(subjectName: string, medium: string) {
  const normalizedSubject = subjectName.toLowerCase();
  
  // Codepoint-based detection for Kannada script subject names
  const codepoints = Array.from(subjectName).map(c => c.codePointAt(0) || 0);
  const isEnglishKannada = codepoints[0] === 0x0C87 && codepoints[1] === 0x0C82 && codepoints[2] === 0x0C97;
  const isHindiKannada = codepoints[0] === 0x0CB9 && codepoints[1] === 0x0CBF;
  const isKannadaSubject = codepoints[0] === 0x0C95 && codepoints[1] === 0x0CA8 && codepoints[2] === 0x0CCD;
  
  // ... rest of detection logic using these flags
}
```

2. **Clear cached chat messages** for the English subject chapters so students don't see stale Kannada-only responses in their history. Run:

```sql
DELETE FROM chat_messages
WHERE chapter_id IN (
  SELECT c.id FROM chapters c
  JOIN subjects s ON c.subject_id = s.id
  WHERE s.id = '9a7cae61-6e23-4e98-abab-5749f88f4e24'
);
```

3. **Deploy** the updated `chat-with-chapter` function.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/chat-with-chapter/index.ts` | Replace string-literal Kannada checks with codepoint-based detection in `getResponseLanguages` |

### Verification
After deployment, the logs should show:
```
SUBJECT: ಇಂಗ್ಲೀಷ MEDIUM: Kannada RESPONSE_LANGUAGE: english_kannada
```
