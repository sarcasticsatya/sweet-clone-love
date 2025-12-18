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
      // Check if mindmap already exists (and is new image format)
      const { data: existingMindmap } = await supabaseClient
        .from("mindmaps")
        .select("mindmap_data")
        .eq("chapter_id", chapterId)
        .single();

      if (existingMindmap) {
        const data = existingMindmap.mindmap_data as any;
        // Only return cached if it's the new image format
        if (data?.type === "image" && data?.imageUrl) {
          console.log("Returning cached image mindmap");
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

    const chapterName = chapter.name || chapter.name_kannada;

    // Step 1: Generate mindmap structure from AI (ALWAYS in English for image generation)
    console.log("Generating mindmap structure...");
    const structureResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Create a hierarchical mind map structure for an educational chapter.

Return a JSON object describing the mindmap:
{
  "title": "Main Topic Title",
  "branches": [
    {
      "name": "Branch 1 Name",
      "subbranches": ["Sub 1.1", "Sub 1.2", "Sub 1.3"]
    }
  ]
}

CRITICAL RULES:
- ALL TEXT MUST BE IN ENGLISH (translate if content is in another language)
- Title should be the main chapter topic IN ENGLISH
- Create 4-6 main branches
- Each branch should have 2-4 subbranches
- Keep text SHORT (2-5 words max per item)
- Use simple, clear English words`
          },
          {
            role: "user",
            content: `Create a mindmap structure for this chapter. TRANSLATE ALL CONTENT TO ENGLISH:\n\nChapter: ${chapterName}\n\nContent:\n${chapter.content_extracted.substring(0, 6000)}`
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

    console.log("Mindmap structure generated:", JSON.stringify(structure).substring(0, 300));

    // Step 2: Generate mindmap as an IMAGE
    console.log("Generating mindmap image...");
    
    const branchDescriptions = structure.branches?.map((b: any, i: number) => 
      `Branch ${i + 1}: "${b.name}" with sub-items: ${b.subbranches?.join(", ") || "none"}`
    ).join("\n") || "";

    const imagePrompt = `Generate a professional MIND MAP diagram image.

EXACT CONTENT TO DISPLAY:
Central Topic: "${structure.title}"

${branchDescriptions}

STRICT VISUAL REQUIREMENTS:
1. Central topic in large rounded rectangle at CENTER
2. Main branches radiating outward with CURVED connecting lines
3. Each branch DIFFERENT COLOR (blue, green, orange, purple, red, teal)
4. Sub-branches extending from main branches
5. WHITE background
6. Large, readable text in each node
7. Rounded corners on all shapes
8. Professional typography
9. Balanced layout - branches evenly spread around center
10. Include relevant small icons near topics

STYLE: Clean, modern, professional mind map. High resolution.`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      console.error("Image generation failed:", errText);
      throw new Error("Failed to generate mindmap image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image URL in response:", JSON.stringify(imageData).substring(0, 500));
      throw new Error("No mindmap image generated");
    }

    console.log("Mindmap image generated successfully");

    // Store mindmap with image URL
    const mindmapData = {
      type: "image",
      imageUrl: imageUrl,
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
