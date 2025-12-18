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

    // Check if mindmap already exists for this chapter
    const { data: existingMindmap } = await supabaseClient
      .from("mindmaps")
      .select("mindmap_data")
      .eq("chapter_id", chapterId)
      .single();

    if (existingMindmap) {
      return new Response(
        JSON.stringify({ mindmap: existingMindmap.mindmap_data }),
        { headers: corsHeaders }
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

    // Step 1: Generate mindmap structure from AI
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
  "title": "Main Topic (in English)",
  "branches": [
    {
      "name": "Branch 1",
      "subbranches": ["Sub 1.1", "Sub 1.2", "Sub 1.3"]
    },
    {
      "name": "Branch 2", 
      "subbranches": ["Sub 2.1", "Sub 2.2"]
    }
  ]
}

Rules:
- Title should be the main chapter topic
- Create 4-6 main branches
- Each branch should have 2-4 subbranches
- Keep text SHORT (2-5 words max per item)
- ALL text must be in ENGLISH (for image generation)`
          },
          {
            role: "user",
            content: `Create a mindmap structure for:\n\nChapter: ${chapterName}\n\nContent:\n${chapter.content_extracted.substring(0, 6000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!structureResponse.ok) {
      throw new Error("Failed to generate mindmap structure");
    }

    const structureData = await structureResponse.json();
    const structureContent = structureData.choices[0]?.message?.content || "";
    const structure = JSON.parse(structureContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());

    console.log("Mindmap structure:", JSON.stringify(structure).substring(0, 200));

    // Step 2: Generate mindmap as an IMAGE (MindMaple/NotebookLM style)
    console.log("Generating mindmap image...");
    
    const branchDescriptions = structure.branches?.map((b: any, i: number) => 
      `Branch ${i + 1}: "${b.name}" with sub-items: ${b.subbranches?.join(", ") || "none"}`
    ).join("\n") || "";

    const imagePrompt = `Create a beautiful, professional mind map image in the style of MindMaple or Google NotebookLM.

MINDMAP CONTENT:
Central Topic: "${structure.title || chapterName}"

${branchDescriptions}

DESIGN REQUIREMENTS:
- Central topic in a large oval/rounded rectangle in the CENTER
- Main branches radiating outward from center like a tree/organic structure
- Each main branch in a DIFFERENT COLOR (use vibrant colors: blue, green, orange, purple, red, teal)
- Sub-branches extending from main branches with smaller text
- Curved, organic connector lines (not straight)
- Clean white background
- Professional typography - clear, readable text
- Hierarchy shown through size: central > branches > sub-branches
- Include small icons or visual elements where appropriate
- Balanced layout with branches spread evenly around center

STYLE:
- Modern, clean design like professional mind mapping software
- Gradient or solid colored nodes
- Soft shadows for depth
- Rounded corners on all shapes
- Clear visual hierarchy

Make it look exactly like a MindMaple or NotebookLM generated mind map. Ultra high resolution.`;

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
