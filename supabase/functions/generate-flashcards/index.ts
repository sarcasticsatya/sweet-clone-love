import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Check if flashcards already exist for this chapter
    const { data: existing } = await supabaseClient
      .from("flashcards")
      .select("id")
      .eq("chapter_id", chapterId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Return existing flashcards
      const { data: flashcards } = await supabaseClient
        .from("flashcards")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at");

      return new Response(
        JSON.stringify({ flashcards }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Generate flashcards using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Generate exactly 12 unique, diverse flashcards from the chapter content that cover different topics and concepts. 
            
REQUIREMENTS:
- Create flashcards that cover DIFFERENT aspects of the chapter (not repeated topics)
- Questions should be clear, specific, and directly related to the chapter content
- Answers should be accurate, detailed, and educational
- Ensure variety: include concept definitions, application questions, and fact-based questions
- Use the same language as the chapter content (Kannada or English)

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
            content: `Chapter: ${chapter.name_kannada || chapter.name}\n\nContent:\n${chapter.content_extracted}`
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
