
## Fix Quiz Generation: Language Issues and Regeneration

### Problems Found

1. **"New Quiz" never actually creates a new quiz** — The `loadQuiz()` function in `QuizView.tsx` never passes `regenerate: true`. The edge function returns cached results every time, so students see the same quiz forever and wrong-language cached quizzes are never replaced.

2. **8 cached quizzes for English subject (Kannada Medium) are in wrong language** — They were generated in Kannada before the language detection fix. Since regeneration never happens, students keep seeing Kannada quizzes for what should be an English subject.

3. **Maths (Kannada Medium) has zero quizzes** — The extracted PDF text for all Maths chapters is corrupted (garbled encoding), so the AI cannot generate meaningful questions from it.

4. **English language validation is too strict** — The edge function rejects English quiz output if it contains any Kannada characters. But English subject chapters in Kannada Medium naturally contain some Kannada text, causing generation to fail after retries.

---

### Fix 1: Make "New Quiz" actually regenerate (QuizView.tsx)

- Change `loadQuiz()` to accept a `regenerate` parameter
- "Start New Quiz" button (first load): calls `loadQuiz(true)` so it always generates a fresh quiz (per the "dynamic content regeneration" requirement)
- "New Quiz" button (after results): calls `loadQuiz(true)` so students get a different quiz each time
- This also fixes wrong-language cached quizzes — next time a student loads quiz for any subject, it regenerates with correct language detection

### Fix 2: Fix language validation in edge function (generate-quiz/index.ts)

- Relax the English language validator to allow minor Kannada characters (since English subject PDFs in Kannada Medium contain Kannada annotations)
- Instead of rejecting any Kannada character, only reject if majority of text is Kannada (e.g., more than 30% non-ASCII)
- Keep strict validation for Kannada and Hindi outputs (must contain respective scripts, must not contain English)

### Fix 3: Delete wrong-language cached quizzes

- The 8 cached quizzes for subject "ಇಂಗ್ಲೀಷ" that are in Kannada need to be deleted so fresh English quizzes get generated
- This will be done via a database migration or manual cleanup

### Fix 4: Add better logging in the edge function

- Add more detailed console.log statements for language detection, content length, and generation attempts
- This helps debug future failures

---

### Technical Details

**File: `src/components/student/QuizView.tsx`**

Change the `loadQuiz` function to accept and pass `regenerate`:

```typescript
const loadQuiz = async (regenerate = true) => {
  // ... existing reset code ...
  const { data, error } = await supabase.functions.invoke("generate-quiz", {
    body: { chapterId, regenerate },
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  // ... rest unchanged ...
};
```

Both "Start New Quiz" and "New Quiz" buttons already call `loadQuiz()` which will now default to `regenerate: true`.

**File: `supabase/functions/generate-quiz/index.ts`**

Relax the English language validation:

```typescript
if (language === "english") {
  // Allow minor non-English chars (Kannada Medium English subject PDFs have annotations)
  const nonAsciiRatio = (allText.match(/[^\x00-\x7F]/g) || []).length / allText.length;
  if (nonAsciiRatio > 0.3) {
    console.log("REJECTING: Too much non-English text:", nonAsciiRatio);
    throw new Error("Output mostly non-English - regenerating");
  }
}
```

**Database cleanup: Delete wrong-language cached quizzes for ಇಂಗ್ಲೀಷ subject**

A SQL migration to delete the 8 quizzes cached for ಇಂಗ್ಲೀಷ subject chapters that contain Kannada text instead of English.

---

### What This Does NOT Fix

- **Corrupted PDF text for ಗಣಿತ chapters** — The extracted content shows garbled encoding. This is a PDF extraction issue that requires re-extracting the PDFs with proper encoding support. Quiz generation for ಗಣಿತ will likely remain unreliable until the source content is fixed. The same corruption exists in other Kannada Medium subjects (ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ) though the AI managed to work around it for those subjects.

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/student/QuizView.tsx` | `loadQuiz` passes `regenerate: true` by default |
| `supabase/functions/generate-quiz/index.ts` | Relax English language validation; improve logging |
| Database | Delete 8 wrong-language cached quizzes for ಇಂಗ್ಲೀಷ |
