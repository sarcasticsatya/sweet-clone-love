

## Fix: English Subject in Kannada Medium Generating Wrong Language

### Problem
The "ಇಂಗ್ಲೀಷ" (English) subject in Kannada Medium has:
- **8 quizzes** cached in Kannada instead of English
- **~96 flashcards** cached in Kannada instead of English
- Chat should be bilingual (English + Kannada) -- this is already correctly configured

The language detection logic (`detectLanguage`) is actually correct and returns "english" for this subject. The root cause is **stale cached data** from before the language detection fix was deployed. Since flashcards load from cache first and quizzes now default to `regenerate: true`, quizzes will self-fix on next load, but flashcards will keep serving the wrong cached data indefinitely.

### Changes

#### 1. Database Cleanup: Delete all wrong-language cached content for "ಇಂಗ್ಲೀಷ" subject

Delete all 8 quizzes and ~96 flashcards cached for the ಇಂಗ್ಲೀಷ subject (subject ID: `9a7cae61-6e23-4e98-abab-5749f88f4e24`). This forces fresh generation in the correct language (English) on next access.

SQL:
```sql
-- Delete wrong-language quizzes
DELETE FROM quizzes WHERE chapter_id IN (
  SELECT id FROM chapters WHERE subject_id = '9a7cae61-6e23-4e98-abab-5749f88f4e24'
);

-- Delete wrong-language flashcards
DELETE FROM flashcards WHERE chapter_id IN (
  SELECT id FROM chapters WHERE subject_id = '9a7cae61-6e23-4e98-abab-5749f88f4e24'
);
```

#### 2. No code changes needed

- **Quiz**: The `detectLanguage` function correctly returns "english" for "ಇಂಗ್ಲೀಷ". With `regenerate: true` as default, new quizzes will generate in English.
- **Flashcards**: The `detectLanguage` function in `generate-flashcards` also correctly handles "ಇಂಗ್ಲೀಷ". Once cached data is deleted, new flashcards will generate in English.
- **Chat**: Already correctly configured as `english_kannada` (bilingual English + Kannada) for this subject.

### Summary

| Item | Current State | After Fix |
|------|--------------|-----------|
| Quiz | Cached in Kannada | Deleted; regenerates in English |
| Flashcards | Cached in Kannada | Deleted; regenerates in English |
| Chat | Bilingual (English + Kannada) | No change needed |

