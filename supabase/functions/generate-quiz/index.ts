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
          error: "Chapter content not available yet. The PDF is still being processed." 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Detect if chapter is in Kannada - check name_kannada field
    const hasKannadaInName = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);
    const isKannadaChapter = hasKannadaInName;
    
    console.log("=== LANGUAGE DETECTION ===");
    console.log("Chapter name_kannada:", chapter.name_kannada);
    console.log("IS KANNADA CHAPTER:", isKannadaChapter);

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

CRITICAL: Generate ALL quiz content in KANNADA (ಕನ್ನಡ) language.

Rules:
- Questions MUST be in Kannada script (ಕನ್ನಡ)
- All 4 options MUST be in Kannada script
- Use Kannada Unicode characters (U+0C80-U+0CFF)
- Scientific formulas (like CO₂, H₂O) can remain as-is
- Numbers can be in either format

Generate exactly 10 multiple-choice questions.
Each question has 4 options.
correctAnswer is index (0-3) of correct option.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "ಕನ್ನಡ ಪ್ರಶ್ನೆ?",
      "options": ["ಆಯ್ಕೆ ೧", "ಆಯ್ಕೆ ೨", "ಆಯ್ಕೆ ೩", "ಆಯ್ಕೆ ೪"],
      "correctAnswer": 0
    }
  ]
}`
              : `You are a quiz generator for English language content.

Generate exactly 10 multiple-choice questions in ENGLISH.
Each question has 4 options.
correctAnswer is index (0-3) of correct option.

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "English question?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}`
          },
          {
            role: "user",
            content: isKannadaChapter 
              ? `Generate a KANNADA quiz from this chapter content:\n\n${chapter.content_extracted.substring(0, 8000)}`
              : `Generate an English quiz from this chapter:\n\n${chapter.content_extracted.substring(0, 8000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      throw new Error("Failed to generate quiz from AI");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    console.log("Quiz AI Response preview:", content.substring(0, 300));
    
    const parsed = JSON.parse(content);
    
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid quiz format: no questions array");
    }

    // Basic validation - ensure questions have required fields
    for (const q of parsed.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error("Invalid question format");
      }
      if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer > 3) {
        q.correctAnswer = 0; // Default to first option if invalid
      }
    }

    // For Kannada chapters, verify at least some Kannada text exists
    if (isKannadaChapter) {
      const allText = parsed.questions.map((q: any) => q.question + q.options.join(" ")).join(" ");
      if (!/[\u0C80-\u0CFF]/.test(allText)) {
        console.error("No Kannada characters found in quiz");
        throw new Error("Quiz generation failed - no Kannada text. Please try again.");
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
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
