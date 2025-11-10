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

    // Check if quiz already exists
    const { data: existing } = await supabaseClient
      .from("quizzes")
      .select("*")
      .eq("chapter_id", chapterId)
      .limit(1)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ quiz: existing }),
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

    // Generate quiz using AI
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
            content: `Generate a quiz with 10 multiple-choice questions from the chapter content. Format as JSON with structure:
            {
              "questions": [
                {
                  "question": "question text",
                  "options": ["option1", "option2", "option3", "option4"],
                  "correctAnswer": 0
                }
              ]
            }
            Use the same language as the chapter (Kannada or English). Make questions clear and educational.`
          },
          {
            role: "user",
            content: `Chapter: ${chapter.name_kannada || chapter.name}\n\nContent:\n${chapter.content_extracted.substring(0, 4000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate quiz");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

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
