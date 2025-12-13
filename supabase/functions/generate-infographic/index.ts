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

    // Check for existing infographic (cached)
    const { data: existing } = await supabaseClient
      .from("infographics")
      .select("*")
      .eq("chapter_id", chapterId)
      .single();

    if (existing) {
      console.log("Returning cached infographic");
      return new Response(
        JSON.stringify({ infographic: existing }),
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
        JSON.stringify({ error: "Chapter content not available" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const chapterName = chapter.name_kannada || chapter.name;
    const isKannada = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);

    // Generate infographic using AI image generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // First, create a summary of the chapter - in English for better image generation
    // For Kannada chapters, we instruct the AI to understand Kannada but create English visual descriptions
    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: isKannada 
              ? `You are analyzing a Kannada (ಕನ್ನಡ) educational chapter. 
Create a concise ENGLISH visual summary prompt for an educational infographic.
The infographic will have visual elements - no text will be rendered, only icons and illustrations.
Return ONLY a single paragraph (max 200 words) describing what the infographic should show visually.
Include: main topic, 3-5 key concepts as visual elements, important diagrams or illustrations.
Focus on VISUAL elements that can be drawn, not text labels.
Make it suitable for high school students studying for exams.`
              : `Create a concise visual summary prompt for an educational infographic. 
The infographic should cover the main topics and key concepts of the chapter.
Return ONLY a single paragraph (max 200 words) describing what the infographic should show visually.
Include: main topic, 3-5 key concepts, important facts/numbers.
Make it suitable for high school students studying for exams.`
          },
          {
            role: "user",
            content: `Chapter: ${chapterName}\n\nContent:\n${chapter.content_extracted.substring(0, 4000)}`
          }
        ]
      }),
    });

    if (!summaryResponse.ok) {
      throw new Error("Failed to generate summary");
    }

    const summaryData = await summaryResponse.json();
    const summaryPrompt = summaryData.choices[0]?.message?.content || "";

    console.log("Summary for infographic:", summaryPrompt.substring(0, 200));

    // Generate infographic image - focus on visual elements, not text
    // For Kannada chapters, we create visually-focused infographics without text to avoid encoding issues
    const imagePrompt = isKannada 
      ? `Create a beautiful, visual educational infographic poster for high school students.
Topic: ${chapter.name} (Indian educational content)
Style: Clean, modern educational infographic with:
- Clear visual hierarchy with icons and illustrations
- Key concepts shown as VISUAL ELEMENTS (icons, diagrams, illustrations) - NO TEXT
- Simple colorful illustrations for each concept
- Arrows or flow lines connecting related ideas
- Pleasant color scheme (blues, greens, or warm educational tones)
- White or light background for readability
- Focus on DIAGRAMS, ICONS, and VISUAL REPRESENTATIONS only
- DO NOT include any text labels - only visual elements

Visual concepts to include:
${summaryPrompt}

Make it look professional, like a visual study poster. Ultra high resolution. NO TEXT AT ALL.`
      : `Create a beautiful, educational infographic poster for high school students. 
Title: "${chapterName}"
Style: Clean, modern educational infographic with:
- Clear hierarchy with the title at top
- Key concepts in colored boxes or bubbles
- Simple icons or illustrations for each concept
- Arrows or flow lines connecting related ideas
- Important facts highlighted
- Pleasant color scheme (blues, greens, or warm educational tones)
- White or light background for readability

Content to visualize:
${summaryPrompt}

Make it look professional, like a study poster students would hang on their wall. Ultra high resolution.`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
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
      throw new Error("Failed to generate infographic image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    console.log("Image generated, length:", imageUrl.length);

    // Store in database (cache)
    const { data: infographic, error: insertError } = await supabaseClient
      .from("infographics")
      .insert({
        chapter_id: chapterId,
        image_url: imageUrl
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // Still return the image even if caching fails
      return new Response(
        JSON.stringify({ infographic: { chapter_id: chapterId, image_url: imageUrl } }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ infographic }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-infographic:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
