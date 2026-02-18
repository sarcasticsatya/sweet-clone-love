import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

function safeParseJSON(content: string): any {
  let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("JSON parse failed, attempting recovery...");
    
    const flashcards: any[] = [];
    const cardRegex = /\{\s*"question"\s*:\s*"([^"]+)"\s*,\s*"answer"\s*:\s*"([^"]+)"\s*\}/g;
    
    let match;
    while ((match = cardRegex.exec(cleaned)) !== null) {
      flashcards.push({
        question: match[1],
        answer: match[2]
      });
    }
    
    if (flashcards.length >= 5) {
      console.log(`Recovered ${flashcards.length} flashcards`);
      return { flashcards };
    }
    
    throw new Error("Could not parse flashcards JSON");
  }
}

// Detect language - SUBJECT NAME takes priority over medium
function detectLanguage(medium: string, subjectName: string): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  console.log(`Language detection - Medium: "${medium}", Subject: "${subjectName}"`);
  
  // PRIORITY 1: Subject-specific language (applies regardless of medium)
  // Kannada subject in ANY medium → Kannada
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    console.log("Result: kannada (Kannada subject - subject name takes priority)");
    return "kannada";
  }
  
  // Hindi subject in ANY medium → Hindi
  if (normalizedSubject.includes("hindi") || subjectName.includes("ಹಿಂದಿ")) {
    console.log("Result: hindi (Hindi subject - subject name takes priority)");
    return "hindi";
  }
  
  // English subject in ANY medium → English (handles "ಇಂಗ್ಲೀಷ" in Kannada medium)
  if (normalizedSubject.includes("english") || subjectName.includes("ಇಂಗ್ಲೀಷ")) {
    console.log("Result: english (English subject - subject name takes priority)");
    return "english";
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

async function generateFlashcardsFromAI(chapter: any, language: "kannada" | "hindi" | "english", apiKey: string, retryCount = 0): Promise<any> {
  const maxRetries = 2;
  
  const systemPrompts = {
    kannada: `Generate exactly 10 flashcards.

LANGUAGE: STRICTLY KANNADA (ಕನ್ನಡ) ONLY
- Questions MUST be in Kannada script ONLY
- Answers MUST be in Kannada script ONLY
- NO English characters allowed (no "Mt", "a", "b", etc.)
- Use Kannada Unicode characters (U+0C80-U+0CFF)
- Do NOT mix any English letters with Kannada text
- Cover key concepts from the chapter

Return ONLY valid JSON:
{"flashcards":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","answer":"ಕನ್ನಡ ಉತ್ತರ"}]}`,
    hindi: `Generate exactly 10 flashcards.

LANGUAGE: STRICTLY HINDI (हिन्दी) ONLY
- Questions MUST be in Hindi/Devanagari script ONLY
- Answers MUST be in Hindi/Devanagari script ONLY
- NO English characters allowed
- Use Hindi Unicode characters (U+0900-U+097F)
- Do NOT mix any English letters with Hindi text
- Cover key concepts from the chapter

Return ONLY valid JSON:
{"flashcards":[{"question":"हिंदी प्रश्न?","answer":"हिंदी उत्तर"}]}`,
    english: `Generate exactly 10 flashcards in ENGLISH ONLY.

LANGUAGE: STRICTLY ENGLISH
- Questions and answers must be in English
- NO Kannada or Hindi text allowed
- Cover key concepts from the chapter
- Questions should test understanding
- Answers should be concise but complete

Return ONLY valid JSON:
{"flashcards":[{"question":"Question?","answer":"Answer"}]}`
  };
  
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompts[language]
        },
        {
          role: "user",
          content: `Generate 10 flashcards from:\n\n${chapter.content_extracted.substring(0, 6000)}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI API error:", errText);
    throw new Error("AI API failed");
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0]?.message?.content || "";
  
  console.log("AI Response length:", content.length);
  console.log("AI Response preview:", content.substring(0, 300));
  
  try {
    const parsed = safeParseJSON(content);
    
    if (!parsed.flashcards || !Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      throw new Error("No flashcards in response");
    }
    
    const validCards = parsed.flashcards.filter((fc: any) => 
      fc.question && typeof fc.question === "string" && 
      fc.answer && typeof fc.answer === "string"
    );
    
    if (validCards.length < 3) {
      throw new Error("Too few valid flashcards");
    }
    
    // Validate language-specific content
    const allText = validCards.map((fc: any) => fc.question + fc.answer).join(" ");
    
    if (language === "kannada") {
      // Must contain Kannada script
      if (!/[\u0C80-\u0CFF]/.test(allText)) {
        throw new Error("No Kannada text found");
      }
      // Must NOT contain English letters (strict validation)
      if (/[a-zA-Z]/.test(allText)) {
        console.log("REJECTING: English characters found in Kannada output");
        throw new Error("Output contains English characters - regenerating");
      }
    }
    
    if (language === "hindi") {
      // Must contain Hindi script
      if (!/[\u0900-\u097F]/.test(allText)) {
        throw new Error("No Hindi text found");
      }
      // Must NOT contain English letters
      if (/[a-zA-Z]/.test(allText)) {
        console.log("REJECTING: English characters found in Hindi output");
        throw new Error("Output contains English characters - regenerating");
      }
    }
    
    if (language === "english") {
      // Must NOT contain Kannada script
      if (/[\u0C80-\u0CFF]/.test(allText)) {
        console.log("REJECTING: Kannada characters found in English output");
        throw new Error("Output contains Kannada characters - regenerating");
      }
      // Must NOT contain Hindi script
      if (/[\u0900-\u097F]/.test(allText)) {
        console.log("REJECTING: Hindi characters found in English output");
        throw new Error("Output contains Hindi characters - regenerating");
      }
    }
    
    return { flashcards: validCards };
  } catch (parseError) {
    console.error("Parse error:", parseError);
    if (retryCount < maxRetries) {
      console.log(`Retrying... attempt ${retryCount + 2}`);
      return generateFlashcardsFromAI(chapter, language, apiKey, retryCount + 1);
    }
    throw parseError;
  }
}

// Helper function to check subject access
async function checkSubjectAccess(supabaseClient: any, userId: string, chapterId: string): Promise<{ hasAccess: boolean; isAdmin: boolean; subjectId: string | null }> {
  // Get chapter's subject_id
  const { data: chapter } = await supabaseClient
    .from("chapters")
    .select("subject_id")
    .eq("id", chapterId)
    .single();

  if (!chapter) {
    return { hasAccess: false, isAdmin: false, subjectId: null };
  }

  // Check if user is admin
  const { data: roleData } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleData?.role === "admin") {
    return { hasAccess: true, isAdmin: true, subjectId: chapter.subject_id };
  }

  // Check if user has access to this subject
  const { data: accessData } = await supabaseClient
    .from("student_subject_access")
    .select("id")
    .eq("student_id", userId)
    .eq("subject_id", chapter.subject_id)
    .single();

  return { hasAccess: !!accessData, isAdmin: false, subjectId: chapter.subject_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, regenerate = false } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: "Chapter ID is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token || "");

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check subject access
    const { hasAccess } = await checkSubjectAccess(supabaseClient, user.id, chapterId);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied. Please purchase this course to access flashcards." }),
        { status: 403, headers: corsHeaders }
      );
    }

    // CACHING: Check if flashcards already exist for this chapter
    if (!regenerate) {
      const { data: existingFlashcards, error: fetchError } = await supabaseClient
        .from("flashcards")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: true });

      if (!fetchError && existingFlashcards && existingFlashcards.length > 0) {
        console.log(`Returning ${existingFlashcards.length} cached flashcards for chapter ${chapterId}`);
        return new Response(
          JSON.stringify({ flashcards: existingFlashcards, cached: true }),
          { headers: corsHeaders }
        );
      }
    }

    // Delete existing flashcards if regenerating
    if (regenerate) {
      console.log("Regenerating flashcards - deleting existing ones");
      await supabaseClient
        .from("flashcards")
        .delete()
        .eq("chapter_id", chapterId);
    }

    // Get chapter content with subject info including medium
    const { data: chapter } = await supabaseClient
      .from("chapters")
      .select(`
        content_extracted, 
        name, 
        name_kannada,
        subjects!inner (
          name,
          name_kannada,
          medium
        )
      `)
      .eq("id", chapterId)
      .single();

    if (!chapter || !chapter.content_extracted) {
      return new Response(
        JSON.stringify({ error: "Chapter content not available" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use medium-based language detection
    const medium = (chapter.subjects as any)?.medium || "English";
    const subjectName = (chapter.subjects as any)?.name || "";
    const language = detectLanguage(medium, subjectName);
    console.log("DETECTED LANGUAGE:", language, "| Medium:", medium, "| Subject:", subjectName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const parsed = await generateFlashcardsFromAI(chapter, language, LOVABLE_API_KEY);
    
    console.log("Successfully parsed", parsed.flashcards.length, "flashcards");

    // Create flashcards without images
    const flashcardsToInsert = parsed.flashcards.map((fc: any) => ({
      chapter_id: chapterId,
      question: fc.question,
      answer: fc.answer,
      image_url: null,
      created_by: user.id
    }));

    const { data: insertedFlashcards, error: insertError } = await supabaseClient
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save flashcards" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Successfully created ${insertedFlashcards.length} flashcards`);

    return new Response(
      JSON.stringify({ flashcards: insertedFlashcards, cached: false }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-flashcards:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
