import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: "Chapter ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing quiz to generate fresh one each session
    await supabaseClient
      .from("quizzes")
      .delete()
      .eq("chapter_id", chapterId);

    // Get chapter content
    const { data: chapter } = await supabaseClient
      .from("chapters")
      .select("content_extracted, name, name_kannada")
      .eq("id", chapterId)
      .single();

    if (!chapter || !chapter.content_extracted) {
      return new Response(
        JSON.stringify({ 
          error: "Chapter content not available yet. The PDF is still being processed. Please wait a moment and try again." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect if chapter is in Kannada - check both name and content
    const hasKannadaInName = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);
    const hasKannadaInContent = /[\u0C80-\u0CFF]/.test(chapter.content_extracted || "");
    const isKannadaChapter = hasKannadaInName || hasKannadaInContent;
    
    console.log("=== LANGUAGE DETECTION ===");
    console.log("Chapter name_kannada:", chapter.name_kannada);
    console.log("Has Kannada in name:", hasKannadaInName);
    console.log("Has Kannada in content:", hasKannadaInContent);
    console.log("IS KANNADA CHAPTER:", isKannadaChapter);
    console.log("Content preview:", chapter.content_extracted?.substring(0, 200));

    // Generate quiz using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: isKannadaChapter 
              ? `You are a quiz generator for KANNADA language content.

==========================================
CRITICAL INSTRUCTION - KANNADA LANGUAGE ONLY
==========================================

The source chapter is written in KANNADA (ಕನ್ನಡ ಭಾಷೆ).

YOU MUST GENERATE THE ENTIRE QUIZ IN KANNADA LANGUAGE.
DO NOT USE ENGLISH. NOT EVEN ONE ENGLISH WORD.

RULES YOU MUST FOLLOW:
✓ Write question in Kannada: ಪ್ರಶ್ನೆ
✓ Write all 4 options in Kannada: ಆಯ್ಕೆಗಳು
✓ Use Kannada Unicode (U+0C80-U+0CFF) characters only
✗ DO NOT write in English
✗ DO NOT mix English and Kannada

CORRECT EXAMPLE (FOLLOW THIS):
{
  "question": "ರಾಸಾಯನಿಕ ಕ್ರಿಯೆ ಯಾವಾಗ ನಡೆಯುತ್ತದೆ?",
  "options": [
    "ರಾಸಾಯನಿಕ ಬದಲಾವಣೆ ಆದಾಗ",
    "ಭೌತಿಕ ಬದಲಾವಣೆ ಮಾತ್ರ ಆದಾಗ",
    "ತಾಪಮಾನ ಬದಲಾದಾಗ",
    "ಯಾವುದೂ ಇಲ್ಲ"
  ],
  "correctAnswer": 0
}

WRONG EXAMPLE (DO NOT DO THIS):
{
  "question": "When does chemical reaction occur?",  ← ENGLISH - WRONG!
  "options": ["When there is change", ...]  ← ENGLISH - WRONG!
}

Generate exactly 10 multiple-choice questions.
Each question must have exactly 4 options.
correctAnswer is the index (0-3) of the correct option.

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "question": "kannada question here",
      "options": ["kannada option1", "kannada option2", "kannada option3", "kannada option4"],
      "correctAnswer": 0
    }
  ]
}`
              : `You are a quiz generator for English language content.

Generate exactly 10 multiple-choice questions in ENGLISH from the chapter content.
Each question must have exactly 4 options.
correctAnswer is the index (0-3) of the correct option.

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "question": "english question here",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0
    }
  ]
}`
          },
          {
            role: "user",
            content: isKannadaChapter 
              ? `⚠️ IMPORTANT: This chapter is in KANNADA language. You MUST generate the quiz in KANNADA ONLY. DO NOT USE ENGLISH.\n\n${chapter.content_extracted}`
              : `Generate quiz in English from this chapter:\n\n${chapter.content_extracted}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate quiz");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0]?.message?.content || "";
    
    // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    console.log("Quiz AI Response:", content.substring(0, 200));
    
    const parsed = JSON.parse(content);
    
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid quiz format: no questions array");
    }

    // Strict Kannada validation for Kannada chapters
    if (isKannadaChapter) {
      // Check all questions and options for English characters
      for (const q of parsed.questions) {
        const textToCheck = q.question + " " + q.options.join(" ");
        // Check for any Latin/English characters (A-Z, a-z)
        if (/[A-Za-z]/.test(textToCheck)) {
          console.error("English detected in Kannada quiz. Question:", q.question);
          throw new Error("Quiz contains English text for Kannada chapter. Please regenerate.");
        }
        // Verify Kannada Unicode presence
        if (!/[\u0C80-\u0CFF]/.test(textToCheck)) {
          console.error("No Kannada detected in quiz text:", textToCheck.substring(0, 100));
          throw new Error("Quiz missing proper Kannada text. Please regenerate.");
        }
        // Check for corrupted encoding
        if (/[ªÃÄÉß®¥½°]/.test(textToCheck)) {
          console.error("Corrupted encoding detected:", textToCheck.substring(0, 100));
          throw new Error("Quiz has corrupted encoding. Please regenerate.");
        }
      }
    }

    // Store quiz in database
    const { data: quiz, error: insertError } = await supabaseClient
      .from("quizzes")
      .insert({
        chapter_id: chapterId,
        title: `${chapter.name_kannada || chapter.name} Quiz`,
        questions: parsed.questions,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting quiz:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save quiz" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
