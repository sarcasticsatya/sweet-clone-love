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
    const { chapterId, regenerate } = await req.json();
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

    // If regenerate, delete existing mindmap first
    if (regenerate) {
      console.log("Regenerating - deleting existing mindmap...");
      await supabaseClient
        .from("mindmaps")
        .delete()
        .eq("chapter_id", chapterId);
    } else {
      // Check if mindmap already exists with new format
      const { data: existingMindmap } = await supabaseClient
        .from("mindmaps")
        .select("mindmap_data")
        .eq("chapter_id", chapterId)
        .single();

      if (existingMindmap) {
        const data = existingMindmap.mindmap_data as any;
        // Return cached if it's the new Kannada structure format
        if (data?.type === "kannada-structure" && data?.structure) {
          console.log("Returning cached Kannada mindmap structure");
          return new Response(
            JSON.stringify({ mindmap: existingMindmap.mindmap_data }),
            { headers: corsHeaders }
          );
        }
        // Delete old format mindmap
        console.log("Deleting old format mindmap...");
        await supabaseClient
          .from("mindmaps")
          .delete()
          .eq("chapter_id", chapterId);
      }
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
          error: "Chapter content not available. Please wait for PDF processing." 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const chapterName = chapter.name_kannada || chapter.name;
    
    // Detect if content has Kannada
    const hasKannada = /[\u0C80-\u0CFF]/.test(chapter.content_extracted);
    console.log("Has Kannada content:", hasKannada);

    // Generate mindmap structure in KANNADA
    console.log("Generating Kannada mindmap structure...");
    const structureResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Create a hierarchical mind map structure for an educational chapter.

CRITICAL: ALL TEXT MUST BE IN KANNADA (ಕನ್ನಡ) LANGUAGE.
If the content is in English, translate everything to Kannada.

Return a JSON object:
{
  "title": "ಮುಖ್ಯ ವಿಷಯ (Main topic in Kannada)",
  "branches": [
    {
      "name": "ಶಾಖೆ ೧ (Branch name in Kannada)",
      "color": "#3b82f6",
      "subbranches": ["ಉಪಶಾಖೆ ೧", "ಉಪಶಾಖೆ ೨"]
    }
  ]
}

Rules:
- Title should be the main chapter topic IN KANNADA
- Create 4-6 main branches with Kannada names
- Each branch should have 2-4 subbranches in Kannada
- Keep text concise (2-6 words in Kannada per item)
- Assign different colors to each branch: #3b82f6 (blue), #10b981 (green), #f59e0b (orange), #8b5cf6 (purple), #ef4444 (red), #06b6d4 (teal)
- Use proper Kannada Unicode script (ಕನ್ನಡ ಅಕ್ಷರಗಳು)`
          },
          {
            role: "user",
            content: `Create a Kannada mindmap structure for this chapter:\n\nChapter: ${chapterName}\n\nContent:\n${chapter.content_extracted.substring(0, 8000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!structureResponse.ok) {
      const errText = await structureResponse.text();
      console.error("Structure generation failed:", errText);
      throw new Error("Failed to generate mindmap structure");
    }

    const structureData = await structureResponse.json();
    const structureContent = structureData.choices[0]?.message?.content || "";
    
    let structure;
    try {
      structure = JSON.parse(structureContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    } catch (e) {
      console.error("Failed to parse structure JSON:", structureContent);
      throw new Error("Failed to parse mindmap structure");
    }

    console.log("Kannada mindmap structure generated:", JSON.stringify(structure).substring(0, 500));

    // Store as Kannada structure (will be rendered as HTML on frontend)
    const mindmapData = {
      type: "kannada-structure",
      structure: structure
    };

    const { error: insertError } = await supabaseClient
      .from("mindmaps")
      .insert({
        chapter_id: chapterId,
        mindmap_data: mindmapData
      });

    if (insertError) {
      console.error("Error saving mindmap:", insertError);
    }

    return new Response(
      JSON.stringify({ mindmap: mindmapData }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-mindmap:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
