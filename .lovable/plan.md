

## Fix: Clear Stale Kannada-Only Chat Messages for English Subject

### Problem
The v3 codepoint fix is deployed and working -- logs confirm `RESPONSE_LANGUAGE: english_kannada`. However, students still see old Kannada-only responses because **112+ cached chat messages** from before the fix are stored in the `chat_messages` table and loaded as persistent history.

### Solution

Create a one-time database migration that deletes all chat messages for chapters belonging to the English subject in Kannada medium (subject ID `9a7cae61-6e23-4e98-abab-5749f88f4e24`). This clears the stale responses so students get fresh, correctly bilingual answers going forward.

### Changes

| File | Change |
|------|--------|
| New migration SQL | `DELETE FROM chat_messages WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = '9a7cae61-6e23-4e98-abab-5749f88f4e24');` |

### What Happens
- All old Kannada-only chat messages for the English subject chapters are removed
- Students opening those chapters will see an empty chat and can ask fresh questions
- New responses will correctly be in English + Kannada (bilingual) as the edge function now detects the language properly
- No other subjects or chapters are affected

