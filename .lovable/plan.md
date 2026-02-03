

## Plan: Fix Kannada Text Corruption in Infographics (PDF Encoding Issue)

### Root Cause Analysis

The logs reveal the true source of the problem:

```
Extracting key points for page 1: Mt ªÀÄgÀzÀ V½ - C. gÁ. «ÄvÀæ
```

This is NOT "Mt" followed by Kannada - it's **corrupted Kannada text** being displayed as Latin characters. The string `Mt ªÀÄgÀzÀ V½` should be `ಒನ ಮರದ ಗಿಳಿ`.

**Problem Chain:**
1. PDF contains Kannada text with embedded fonts
2. `pdfjs-serverless` extracts text but doesn't map custom fonts correctly
3. Corrupted text like `Mt ªÀÄgÀzÀ` is stored in `content_extracted`
4. `generate-infographic` uses `splitIntoSections` which creates section titles from this corrupted content
5. These corrupted titles appear in the infographic UI

**Evidence from database:**
```
content_preview: 9 7 ඛජౣ ೕಟದ ย ๻ ಯ ౪ ඝ ෈ ಟ ౣ ಮಂ ഷ...
```
This shows Thai (`ย`), Telugu (`ౣ`), Sinhala (`ඛ`) and other random Unicode characters mixed together - classic font mapping corruption.

---

### Solution: Two-Part Fix

#### Part 1: Fix Infographic Section Titles (Immediate Fix)

Instead of using titles from corrupted `splitIntoSections`, use the chapter's `name_kannada` (which is correctly stored) as the primary title and generate generic Kannada section titles via AI.

**File:** `supabase/functions/generate-infographic/index.ts`

**Changes to `splitIntoSections` function:**

```typescript
async function splitIntoSections(
  content: string, 
  chapterName: string,  // Use chapter name, not extracted titles
  language: "kannada" | "hindi" | "english",
  apiKey: string
): Promise<{ title: string; content: string }[]> {
  
  // For Kannada content, don't use titles from corrupted text
  // Instead, generate proper Kannada section titles
  if (language === "kannada") {
    const partLength = Math.ceil(content.length / 2);
    
    // Ask AI to generate proper Kannada section titles
    const titlesPrompt = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Based on the chapter name, generate 2 section titles in KANNADA.
Chapter: ${chapterName}
Return JSON: {"titles": ["ಮೊದಲ ಭಾಗ ಶೀರ್ಷಿಕೆ", "ಎರಡನೇ ಭಾಗ ಶೀರ್ಷಿಕೆ"]}`
        }
      ],
      response_format: { type: "json_object" }
    };
    
    try {
      const response = await fetch(AI_URL, { /* ... */ });
      const data = await response.json();
      const titles = JSON.parse(data.choices[0]?.message?.content).titles;
      
      return [
        { title: titles[0] || "ಮುಖ್ಯ ಪರಿಕಲ್ಪನೆಗಳು", content: content.substring(0, partLength) },
        { title: titles[1] || "ಸಾರಾಂಶ", content: content.substring(partLength) }
      ];
    } catch {
      return [
        { title: "ಮುಖ್ಯ ಪರಿಕಲ್ಪನೆಗಳು", content: content.substring(0, partLength) },
        { title: "ಸಾರಾಂಶ", content: content.substring(partLength) }
      ];
    }
  }
  
  // Existing logic for English content...
}
```

#### Part 2: Use Chapter Name as Primary Title

When displaying the infographic, use `chapter.name_kannada` (which is correctly stored) instead of relying on section titles from the corrupted text.

**Changes to key points extraction:**

```typescript
// In extractKeyPoints function, for the title:
// Instead of using the corrupted sectionTitle from content,
// let AI generate a proper Kannada title based on the chapter name
```

---

### Implementation Details

**File to Modify:** `supabase/functions/generate-infographic/index.ts`

**Change 1: Add language parameter to `splitIntoSections`** (line 182-258)

The function currently extracts section titles from the corrupted content. For Kannada, we'll:
1. Skip content-based title extraction
2. Use AI to generate proper Kannada section titles based on the chapter name
3. Use fallback generic Kannada titles if AI fails

**Change 2: Update the main handler** (around line 429)

Pass the detected language to `splitIntoSections`:

```typescript
const sections = await splitIntoSections(
  chapter.content_extracted, 
  chapterName, 
  language,  // Add this parameter
  LOVABLE_API_KEY
);
```

**Change 3: Use chapter name in key points** (lines 433-436)

Ensure the chapter's correct Kannada name is used as context:

```typescript
const keyPointsPromises = sections.slice(0, 2).map((section, idx) =>
  extractKeyPoints(
    section.content, 
    chapterName,  // Use chapter.name_kannada instead of section.title
    idx + 1, 
    language, 
    LOVABLE_API_KEY
  )
);
```

---

### Fallback Kannada Titles

For when AI generation fails, use these default section titles:

| Section | English | Kannada |
|---------|---------|---------|
| Section 1 | "Key Concepts" | "ಮುಖ್ಯ ಪರಿಕಲ್ಪನೆಗಳು" |
| Section 2 | "Summary" | "ಸಾರಾಂಶ" |

---

### Clear Existing Corrupted Cache

After deploying the fix, clear all existing infographics to regenerate with proper titles:

```sql
DELETE FROM infographics;
```

---

### Summary of Changes

| Location | Change |
|----------|--------|
| `splitIntoSections()` | Add language parameter; for Kannada, generate proper titles via AI instead of extracting from corrupted text |
| Main handler | Pass language to `splitIntoSections` |
| Key points extraction | Use `chapter.name_kannada` as context instead of corrupted section titles |
| Database | Clear all cached infographics after deployment |

---

### Expected Results

**Before:** `Mt ªÀÄgÀzÀ V½ - C. gÁ. «ÄvÀæ`

**After:** `ಮುಖ್ಯ ಪರಿಕಲ್ಪನೆಗಳು` or AI-generated proper Kannada title like `ಮರದ ಗಿಳಿ - ಪರಿಚಯ`

---

### Technical Note

The underlying PDF text extraction issue (corrupted `content_extracted`) is a deeper problem with `pdfjs-serverless` not handling embedded Kannada fonts. Fixing that would require either:
1. Using OCR instead of text extraction
2. Using a different PDF library with better font support
3. Re-uploading PDFs with proper Unicode fonts

This plan addresses the **symptom** (corrupted titles in infographics) rather than the root cause, which provides immediate relief while the PDF extraction issue can be addressed separately.

