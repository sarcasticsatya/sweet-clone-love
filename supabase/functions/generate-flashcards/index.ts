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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token || "");

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing flashcards to generate fresh ones each session
    await supabaseClient
      .from("flashcards")
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

    // Generate flashcards using AI
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
            content: `You are a flashcard generator. Generate exactly 12 unique, diverse flashcards from the chapter content that cover different topics and concepts.

${isKannadaChapter 
  ? `CRITICAL LANGUAGE REQUIREMENT - READ THIS CAREFULLY:
==========================================
The chapter is written in KANNADA language (ಕನ್ನಡ).
You MUST generate ALL flashcards in KANNADA language ONLY.

MANDATORY RULES:
1. Write ALL questions in Kannada script (ಕನ್ನಡ ಲಿಪಿ)
2. Write ALL answers in Kannada script
3. DO NOT use English words AT ALL
4. DO NOT mix languages
5. Use proper Kannada Unicode characters (U+0C80-U+0CFF)

EXAMPLE OF CORRECT KANNADA FLASHCARD:
{
  "question": "ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಎಂದರೇನು?",
  "answer": "ಸಸ್ಯಗಳು ಸೂರ್ಯನ ಬೆಳಕಿನ ಸಹಾಯದಿಂದ ಆಹಾರವನ್ನು ತಯಾರಿಸುವ ಪ್ರಕ್ರಿಯೆ"
}

EXAMPLE OF WRONG (DO NOT DO THIS):
{
  "question": "What is photosynthesis?",  ← WRONG! This is English
  "answer": "Process by which plants..."  ← WRONG! This is English
}

Remember: The source chapter is in Kannada, so your flashcards MUST be in Kannada.`
  : `The chapter is in English. Generate all flashcards in English.`}

FLASHCARD REQUIREMENTS:
- Create flashcards that cover DIFFERENT aspects of the chapter (not repeated topics)
- Questions should be clear, specific, and directly related to the chapter content
- Answers should be accurate, detailed, and educational
- Ensure variety: include concept definitions, application questions, and fact-based questions

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "flashcards": [
    {"question": "question text here", "answer": "detailed answer here"}
  ]
}

Do NOT wrap the response in markdown code blocks or any other formatting.`
          },
          {
            role: "user",
            content: isKannadaChapter 
              ? `This is a Kannada language chapter. Generate flashcards in KANNADA ONLY.\n\nChapter: ${chapter.name_kannada || chapter.name}\n\nContent:\n${chapter.content_extracted}`
              : `Chapter: ${chapter.name}\n\nContent:\n${chapter.content_extracted}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate flashcards");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0]?.message?.content || "";
    
    // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    console.log("Flashcards AI Response:", content.substring(0, 200));
    
    const parsed = JSON.parse(content);
    
    if (!parsed.flashcards || !Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      throw new Error("Invalid flashcard format: no flashcards array");
    }
    
    // Validate Kannada encoding if it's a Kannada chapter
    if (isKannadaChapter) {
      const sampleText = parsed.flashcards[0]?.question || "";
      // Check if text contains proper Kannada Unicode (U+0C80-U+0CFF)
      const hasProperKannada = /[\u0C80-\u0CFF]/.test(sampleText);
      // Check for corrupted encoding markers
      const hasCorruptedChars = /[ªÃÄÉß®¥½°]/.test(sampleText);
      
      if (!hasProperKannada || hasCorruptedChars) {
        console.error("Detected corrupted Kannada encoding in flashcards. Sample:", sampleText.substring(0, 100));
        throw new Error("Flashcards generated with corrupted encoding. Please try again.");
      }
    }
    
    const flashcardsArray = parsed.flashcards || parsed.cards || parsed.items || [];

    // Store flashcards in database
    const flashcardsToInsert = flashcardsArray.map((fc: any) => ({
      chapter_id: chapterId,
      question: fc.question,
      answer: fc.answer,
      created_by: user.id
    }));

    const { data: insertedFlashcards, error: insertError } = await supabaseClient
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting flashcards:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save flashcards" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ flashcards: insertedFlashcards }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-flashcards:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
