

## Plan: Fix Language Detection, Unicode Handling, and Quiz Option A Bug

### Issues Identified

After thorough analysis, I've identified the following problems:

1. **Quiz "All Option A Correct" Bug**: The AI prompt in `generate-quiz/index.ts` shows example with `correctAnswer: 0` (option A), potentially biasing the AI to always set option A as correct.

2. **Mixed Language Output** (e.g., "Mt ಮರದ ಗಿಳಿ..."): The language detection functions use the `subjects.name` field which can contain English text even for Kannada Medium subjects. The detection should use the `medium` column from the subjects table.

3. **English Medium Subjects Showing Kannada**: The current `detectLanguage()` function checks for Kannada script in content rather than using the subject's `medium` field. This causes English Medium subjects to sometimes get Kannada output.

4. **Admin Reports Unicode Characters in Excel**: The CSV export in `DataExport.tsx` is missing the UTF-8 BOM (Byte Order Mark) which Excel requires to properly display Kannada characters.

---

### Solution Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Language Detection Flow                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Subject Medium = "English"                                 │
│  ├── English subject → ENGLISH ONLY                        │
│  ├── Kannada II subject → ENGLISH + KANNADA                │
│  └── Hindi III subject → ENGLISH + HINDI                   │
│                                                             │
│  Subject Medium = "Kannada"                                 │
│  ├── ಇಂಗ್ಲೀಷ subject → KANNADA + ENGLISH                    │
│  ├── ಹಿಂದಿ subject → KANNADA + HINDI                        │
│  └── Others (ಕನ್ನಡ/ವಿಜ್ಞಾನ/ಗಣಿತ...) → KANNADA ONLY          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 1: Fix Quiz "Option A Always Correct" Bug

**File:** `supabase/functions/generate-quiz/index.ts`

**Problem:** The example JSON in system prompts always shows `correctAnswer: 0` (option A), biasing the AI.

**Solution:** Modify the system prompts to explicitly:
1. Add instruction to randomize correct answer position
2. Change example to show different `correctAnswer` values
3. Add explicit instruction about varying correct answers

**Current Prompt (line 88-89):**
```
Return ONLY valid JSON:
{"questions":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","options":["ಆ","ಬ","ಸ","ದ"],"correctAnswer":0}]}
```

**Updated Prompt:**
```
IMPORTANT: Vary the correctAnswer across ALL questions (use 0, 1, 2, 3 evenly). 
Do NOT always set correctAnswer to 0.

Return ONLY valid JSON:
{"questions":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","options":["ಆ","ಬ","ಸ","ದ"],"correctAnswer":2}]}
```

---

### Step 2: Refactor Language Detection to Use Subject Medium

**Files to Update:**
- `supabase/functions/generate-quiz/index.ts`
- `supabase/functions/generate-flashcards/index.ts`
- `supabase/functions/generate-mindmap/index.ts`
- `supabase/functions/generate-infographic/index.ts`

**Current Approach:** Detection based on script characters in content/names
**New Approach:** Use `subjects.medium` column ("English" or "Kannada") as primary determinant

**New `detectLanguage` Function:**
```typescript
function detectLanguage(
  medium: string, 
  subjectName: string
): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  if (medium === "English") {
    // English Medium subjects - output in English
    // Except Hindi III which needs Hindi
    if (normalizedSubject.includes("hindi")) {
      return "hindi";
    }
    return "english";
  }
  
  // Kannada Medium subjects
  // Hindi subject (ಹಿಂದಿ) - output in Hindi
  if (subjectName === "ಹಿಂದಿ" || normalizedSubject.includes("hindi")) {
    return "hindi";
  }
  
  // All other Kannada Medium subjects - output in Kannada
  return "kannada";
}
```

**Database Query Update:** Fetch `medium` from subjects:
```typescript
const { data: chapter } = await supabaseClient
  .from("chapters")
  .select(`
    content_extracted, 
    name, 
    name_kannada,
    subjects!inner (
      name,
      name_kannada,
      medium  // Add this field
    )
  `)
  .eq("id", chapterId)
  .single();

const medium = (chapter.subjects as any)?.medium || "English";
const subjectName = (chapter.subjects as any)?.name || "";
const language = detectLanguage(medium, subjectName);
```

---

### Step 3: Strengthen AI Prompts for Strict Language Output

**Quiz Generation - Kannada Prompt:**
```typescript
kannada: `You are a quiz generator. Generate exactly 15 UNIQUE multiple-choice questions.

LANGUAGE: STRICTLY KANNADA (ಕನ್ನಡ) ONLY
- Questions MUST be in Kannada script ONLY
- Options MUST be in Kannada script ONLY  
- NO English characters allowed (no "Mt", "a", "b", etc.)
- Use Kannada numerals if needed: ೧, ೨, ೩, ೪
- All text must use Unicode range U+0C80-U+0CFF

IMPORTANT: Randomize correctAnswer across questions (use 0, 1, 2, 3 evenly).

Return ONLY valid JSON:
{"questions":[{"question":"ಪ್ರಶ್ನೆ?","options":["ಆಯ್ಕೆ ೧","ಆಯ್ಕೆ ೨","ಆಯ್ಕೆ ೩","ಆಯ್ಕೆ ೪"],"correctAnswer":2}]}`
```

**Quiz Generation - English Prompt:**
```typescript
english: `Generate exactly 15 UNIQUE multiple-choice questions in ENGLISH ONLY.

LANGUAGE: STRICTLY ENGLISH
- Questions and all options must be in English
- NO Kannada or Hindi text allowed
- Use proper English grammar and terminology

IMPORTANT: Randomize correctAnswer across questions (use 0, 1, 2, 3 evenly).

Return ONLY valid JSON:
{"questions":[{"question":"Question?","options":["Option A","Option B","Option C","Option D"],"correctAnswer":1}]}`
```

---

### Step 4: Fix Admin Export Unicode Display in Excel

**File:** `src/components/admin/DataExport.tsx`

**Problem:** Excel doesn't recognize UTF-8 encoding without BOM (Byte Order Mark)

**Solution:** Add UTF-8 BOM to CSV exports

**Current Code (line 13-18):**
```typescript
const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  // ...
};
```

**Updated Code:**
```typescript
const downloadCSV = (content: string, filename: string) => {
  // Add UTF-8 BOM for proper Excel display of Kannada/Unicode text
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
```

---

### Step 5: Fix Admin Reports (ViewReports.tsx) Unicode Display

**File:** `src/components/admin/ViewReports.tsx`

**Same Fix:** Add UTF-8 BOM to CSV export in `exportToCSV` function

**Update line ~458:**
```typescript
const exportToCSV = () => {
  const BOM = '\uFEFF';
  const csvContent = [
    // ... headers and rows
  ].join("\n");

  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  // ...
};
```

---

### Step 6: Add Validation to Reject Mixed-Language Output

**In all generation functions, add strict validation:**

```typescript
// Validate language-specific content
const allText = validQuestions.map((q: any) => 
  q.question + q.options.join(" ")
).join(" ");

if (language === "kannada") {
  // Check for any English letters (a-zA-Z) which should NOT be present
  if (/[a-zA-Z]/.test(allText)) {
    console.log("REJECTING: English characters found in Kannada output");
    throw new Error("Output contains English characters - regenerating");
  }
}

if (language === "english") {
  // Check for any Kannada script which should NOT be present
  if (/[\u0C80-\u0CFF]/.test(allText)) {
    console.log("REJECTING: Kannada characters found in English output");
    throw new Error("Output contains Kannada characters - regenerating");
  }
}
```

---

### Summary of Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-quiz/index.ts` | 1. Fix correctAnswer bias 2. Use medium-based detection 3. Strengthen prompts 4. Add validation |
| `supabase/functions/generate-flashcards/index.ts` | 1. Use medium-based detection 2. Strengthen prompts 3. Add validation |
| `supabase/functions/generate-mindmap/index.ts` | 1. Use medium-based detection 2. Strengthen prompts |
| `supabase/functions/generate-infographic/index.ts` | 1. Use medium-based detection 2. Strengthen prompts |
| `src/components/admin/DataExport.tsx` | Add UTF-8 BOM for Excel compatibility |
| `src/components/admin/ViewReports.tsx` | Add UTF-8 BOM for Excel compatibility |

---

### Expected Results After Implementation

1. **Quiz Options:** Correct answers will be evenly distributed across A, B, C, D (not always A)

2. **Kannada Medium Subjects:** 
   - ಕನ್ನಡ, ಗಣಿತ, ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ → Pure Kannada output (no English mixing)
   - ಹಿಂದಿ → Hindi output
   - ಇಂಗ್ಲೀಷ → Kannada + English bilingual

3. **English Medium Subjects:**
   - ENGLISH, MATHS, SCIENCE, SOCIAL SCIENCE → Pure English output (no Kannada)
   - KANNADA II → English + Kannada bilingual
   - HINDI III → English + Hindi bilingual

4. **Admin Reports:** Kannada text displays correctly in Excel with proper Unicode rendering

