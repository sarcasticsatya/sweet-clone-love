

## Plan: Fix Language Detection for Kannada Subjects and Localize Study Tools UI

### Problem Summary

The current language detection logic uses `medium` as the primary determinant, but the requirement is:
- **Any Kannada subject** (regardless of medium) → Kannada output
- **Any Hindi subject** (regardless of medium) → Hindi output  
- **English subject in English Medium** → English output
- **English subject in Kannada Medium** → Kannada + English bilingual

Additionally, the Study Tools UI (FlashcardsView, QuizView, MindmapView) should show Kannada labels when the subject is Kannada-centric.

---

### Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW Language Detection Logic                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SUBJECT NAME CHECK (Primary - applies regardless of medium)        │
│  ├── Contains "KANNADA" or "ಕನ್ನಡ" → KANNADA                         │
│  ├── Contains "HINDI" or "ಹಿಂದಿ" → HINDI                             │
│  └── Fall through to medium-based logic                             │
│                                                                     │
│  MEDIUM-BASED FALLBACK                                              │
│  ├── English Medium → ENGLISH                                       │
│  └── Kannada Medium → KANNADA                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Part 1: Update Language Detection in Edge Functions

**Files to Update:**
- `supabase/functions/generate-quiz/index.ts`
- `supabase/functions/generate-flashcards/index.ts`
- `supabase/functions/generate-mindmap/index.ts`
- `supabase/functions/generate-infographic/index.ts`

**New `detectLanguage` Function:**

```typescript
function detectLanguage(medium: string, subjectName: string): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  console.log(`Language detection - Medium: "${medium}", Subject: "${subjectName}"`);
  
  // PRIORITY 1: Subject-specific language (applies regardless of medium)
  // Kannada subject in ANY medium → Kannada
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    console.log("Result: kannada (Kannada subject)");
    return "kannada";
  }
  
  // Hindi subject in ANY medium → Hindi
  if (normalizedSubject.includes("hindi") || subjectName.includes("ಹಿಂದಿ")) {
    console.log("Result: hindi (Hindi subject)");
    return "hindi";
  }
  
  // PRIORITY 2: Medium-based default for other subjects
  if (medium === "English") {
    console.log("Result: english (English medium, non-language subject)");
    return "english";
  }
  
  // Kannada Medium (for subjects like ಗಣಿತ, ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ, ಇಂಗ್ಲೀಷ)
  console.log("Result: kannada (Kannada medium)");
  return "kannada";
}
```

**Expected Results:**

| Subject | Medium | Current Output | New Output |
|---------|--------|----------------|------------|
| KANNADA II LAUNGAUGE | English | English ❌ | Kannada ✅ |
| ಕನ್ನಡ | Kannada | Kannada ✅ | Kannada ✅ |
| HINDI III LAUNGAUGE | English | Hindi ✅ | Hindi ✅ |
| ಹಿಂದಿ | Kannada | Hindi ✅ | Hindi ✅ |
| ENGLISH (FIRST LAUNGAUGE) | English | English ✅ | English ✅ |
| ಇಂಗ್ಲೀಷ | Kannada | Kannada ✅ | Kannada ✅ |
| MATHS | English | English ✅ | English ✅ |
| ಗಣಿತ | Kannada | Kannada ✅ | Kannada ✅ |

---

### Part 2: Localize Study Tools UI Components

The frontend components need to display Kannada UI text when a Kannada subject is selected.

**Changes Required:**

1. **Pass subject info to components**: Update `ToolsPanel.tsx` to pass `subjectId` to child components
2. **Fetch subject medium**: Each component fetches the subject's medium/name to determine UI language
3. **Conditional UI text**: Display Kannada labels when subject is Kannada-centric

**FlashcardsView.tsx UI Text Changes:**

| English Text | Kannada Text |
|--------------|--------------|
| Loading flashcards... | ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ... |
| Generating flashcards... | ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ... |
| No flashcards available yet | ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ |
| Generate Flashcards | ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ರಚಿಸಿ |
| Card X of Y | ಕಾರ್ಡ್ X ರಲ್ಲಿ Y |
| Question | ಪ್ರಶ್ನೆ |
| Answer | ಉತ್ತರ |
| Tap to reveal | ತೋರಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ |
| New | ಹೊಸ |

**QuizView.tsx UI Text Changes:**

| English Text | Kannada Text |
|--------------|--------------|
| Generating Quiz | ಕ್ವಿಜ್ ರಚಿಸಲಾಗುತ್ತಿದೆ |
| Creating questions... | ಪ್ರಶ್ನೆಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ... |
| Test your knowledge with a quiz | ಕ್ವಿಜ್ ಮೂಲಕ ನಿಮ್ಮ ಜ್ಞಾನವನ್ನು ಪರೀಕ್ಷಿಸಿ |
| Start New Quiz | ಹೊಸ ಕ್ವಿಜ್ ಪ್ರಾರಂಭಿಸಿ |
| Best Score | ಅತ್ಯುತ್ತಮ ಅಂಕ |
| Recent Attempts | ಇತ್ತೀಚಿನ ಪ್ರಯತ್ನಗಳು |
| Progress | ಪ್ರಗತಿ |
| Submit | ಸಲ್ಲಿಸಿ |
| Previous | ಹಿಂದಿನ |
| Next | ಮುಂದಿನ |
| Solutions | ಪರಿಹಾರಗಳು |
| New Quiz | ಹೊಸ ಕ್ವಿಜ್ |
| correct | ಸರಿ |
| Excellent! | ಅದ್ಭುತ! |
| Good effort! | ಉತ್ತಮ ಪ್ರಯತ್ನ! |
| Keep practicing! | ಅಭ್ಯಾಸ ಮುಂದುವರಿಸಿ! |

**MindmapView.tsx - Already has Kannada text, but needs conditional logic**

---

### Part 3: Implementation Details

**Step 1: Create language utility function**

Add a helper function to determine if subject is Kannada-centric:

```typescript
const isKannadaSubject = (subjectName: string, medium: string): boolean => {
  const normalizedSubject = subjectName.toLowerCase();
  // Kannada subject in any medium
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    return true;
  }
  // Kannada medium (except English/Hindi subjects)
  if (medium === "Kannada" && !normalizedSubject.includes("english") && !subjectName.includes("ಇಂಗ್ಲೀಷ")) {
    return true;
  }
  return false;
};
```

**Step 2: Update components to fetch subject info and apply conditional UI**

Each component will:
1. Fetch the chapter's subject info (name, medium) when chapterId changes
2. Use `isKannadaSubject()` to determine UI language
3. Render appropriate text based on the result

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-quiz/index.ts` | Update `detectLanguage()` - subject-first logic |
| `supabase/functions/generate-flashcards/index.ts` | Update `detectLanguage()` - subject-first logic |
| `supabase/functions/generate-mindmap/index.ts` | Update `detectLanguage()` - subject-first logic |
| `supabase/functions/generate-infographic/index.ts` | Update `detectLanguage()` - subject-first logic |
| `src/components/student/FlashcardsView.tsx` | Add subject fetch + conditional Kannada UI |
| `src/components/student/QuizView.tsx` | Add subject fetch + conditional Kannada UI |
| `src/components/student/MindmapView.tsx` | Already partially Kannada, add conditional logic |
| `src/components/student/ToolsPanel.tsx` | Pass subjectId to child components |

---

### Expected Results After Implementation

1. **KANNADA II LAUNGAUGE (English Medium)**: 
   - Flashcards → Kannada content
   - Quiz → Kannada questions & options
   - Mindmap → Kannada structure
   - UI Labels → Kannada text

2. **ಕನ್ನಡ (Kannada Medium)**:
   - All content → Kannada
   - UI Labels → Kannada text

3. **ENGLISH (English Medium)**:
   - All content → English
   - UI Labels → English text

4. **MATHS (English Medium)**:
   - All content → English
   - UI Labels → English text

5. **ಗಣಿತ (Kannada Medium)**:
   - All content → Kannada
   - UI Labels → Kannada text

---

### Technical Notes

- The `detectLanguage` function change is critical - it must check subject name BEFORE checking medium
- UI localization requires fetching subject info in each component, which adds a small API call overhead
- All cached content will need to be regenerated to apply new language rules

