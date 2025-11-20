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
    const hasKannadaInName = /[\u0C80-\u0CFF]/.test(chapter.name_kannada || "");
    const hasKannadaInContent = /[\u0C80-\u0CFF]/.test(chapter.content_extracted || "");
    const isKannadaChapter = hasKannadaInName || hasKannadaInContent;

    // Generate mindmap using AI
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
            content: `You are a mind map generator for Karnataka SSLC students. Create a hierarchical mind map of the chapter content in markdown format.

${isKannadaChapter ? `**CRITICAL LANGUAGE REQUIREMENT:**
YOU MUST CREATE THE ENTIRE MINDMAP IN KANNADA (ಕನ್ನಡ) LANGUAGE ONLY.
- All headings MUST be in Kannada script (ಕನ್ನಡ ಲಿಪಿ)
- All content MUST be in Kannada script (ಕನ್ನಡ ಲಿಪಿ)
- Use proper Kannada grammar and vocabulary
- This is a KANNADA chapter - DO NOT use English at all
` : ''}

REQUIREMENTS:
- Organize main topics, subtopics, and key concepts in a clear hierarchy
- Use markdown headers (##, ###, ####) for different levels
- Use bullet points for details under each concept
- Include important terms, definitions, and relationships
- Keep it concise but comprehensive

Format example:
## Main Topic 1
- Key concept A
  - Detail 1
  - Detail 2
- Key concept B

## Main Topic 2
...`
          },
          {
            role: "user",
            content: `Chapter: ${chapter.name_kannada || chapter.name}\n\nContent:\n${chapter.content_extracted}`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate mindmap");
    }

    const aiData = await aiResponse.json();
    const mindmap = aiData.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ mindmap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-mindmap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
