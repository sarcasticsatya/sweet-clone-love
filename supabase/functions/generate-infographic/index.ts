import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Generate a single infographic page - ALWAYS with English text (AI cannot render Kannada)
async function generateInfographicPage(
  sectionContent: string,
  sectionTitle: string,
  pageNumber: number,
  totalPages: number,
  apiKey: string
): Promise<string | null> {
  try {
    console.log(`Generating infographic page ${pageNumber}/${totalPages}: ${sectionTitle}`);

    // First extract and TRANSLATE key points to English (AI image gen cannot render Kannada)
    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract 4-5 KEY POINTS from this educational content.
IMPORTANT: Return the points in ENGLISH only. If content is in Kannada or any other language, TRANSLATE to English.

Format: Return ONLY a JSON object with "points" array containing English text.
Example: {"points": ["First key point in English", "Second key point in English"]}

Each point should be 5-10 words maximum, clear and educational.`
          },
          {
            role: "user",
            content: `Section: ${sectionTitle}\n\nContent:\n${sectionContent.substring(0, 3000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!summaryResponse.ok) {
      throw new Error("Failed to generate summary");
    }

    const summaryData = await summaryResponse.json();
    let keyPoints: string[] = [];
    
    try {
      const parsed = JSON.parse(summaryData.choices[0]?.message?.content || "{}");
      keyPoints = parsed.points || [];
    } catch {
      keyPoints = ["Key concept 1", "Key concept 2", "Key concept 3", "Key concept 4"];
    }

    console.log(`Key points for page ${pageNumber}:`, keyPoints);

    // Generate infographic with English text (AI cannot render Kannada properly)
    const imagePrompt = `Generate an EDUCATIONAL INFOGRAPHIC POSTER IMAGE.

PAGE ${pageNumber} OF ${totalPages}
TOPIC: ${sectionTitle}

EXACT TEXT TO INCLUDE IN IMAGE:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

STRICT DESIGN REQUIREMENTS:
1. Include ALL the numbered points above as readable text in the image
2. Each point in a colored box/bubble (different colors: blue, green, orange, purple)
3. Large, bold font - minimum 24pt equivalent for readability
4. White/light cream background
5. Relevant educational icons next to each point
6. Connecting arrows between related concepts
7. Professional infographic poster layout
8. Clear visual hierarchy with numbered sections
9. Add small relevant illustrations/diagrams

CRITICAL: The text must be clearly readable and properly rendered.
Ultra high resolution educational poster.`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
      console.error(`Image generation failed for page ${pageNumber}:`, errText);
      return null;
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    return imageUrl || null;
  } catch (error) {
    console.error(`Error generating page ${pageNumber}:`, error);
    return null;
  }
}

// Split chapter content into logical sections
async function splitIntoSections(content: string, chapterName: string, apiKey: string): Promise<{ title: string; content: string }[]> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Split the chapter content into 4 logical sections for creating a multi-page infographic.
Return section titles in ENGLISH (translate if needed).

Return a JSON object:
{
  "sections": [
    { "title": "Section Title in English", "startPhrase": "first few words" }
  ]
}

Rules:
- Create exactly 4 sections
- Each section should cover a distinct topic
- Titles MUST be in English`
          },
          {
            role: "user",
            content: `Chapter: ${chapterName}\n\nContent:\n${content.substring(0, 8000)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to split sections");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || "{}");
    
    if (!result.sections || result.sections.length === 0) {
      const partLength = Math.ceil(content.length / 4);
      return [
        { title: "Introduction", content: content.substring(0, partLength) },
        { title: "Core Concepts", content: content.substring(partLength, partLength * 2) },
        { title: "Key Details", content: content.substring(partLength * 2, partLength * 3) },
        { title: "Summary", content: content.substring(partLength * 3) }
      ];
    }

    const sections: { title: string; content: string }[] = [];
    const contentLower = content.toLowerCase();
    
    for (let i = 0; i < result.sections.length; i++) {
      const section = result.sections[i];
      const startIdx = contentLower.indexOf(section.startPhrase?.toLowerCase() || "");
      const nextSection = result.sections[i + 1];
      const endIdx = nextSection 
        ? contentLower.indexOf(nextSection.startPhrase?.toLowerCase() || "")
        : content.length;
      
      if (startIdx !== -1 && endIdx > startIdx) {
        sections.push({
          title: section.title,
          content: content.substring(startIdx, endIdx)
        });
      } else {
        const partLength = Math.ceil(content.length / result.sections.length);
        sections.push({
          title: section.title,
          content: content.substring(i * partLength, (i + 1) * partLength)
        });
      }
    }

    return sections.length > 0 ? sections : [
      { title: "Introduction", content: content.substring(0, Math.ceil(content.length / 4)) },
      { title: "Main Concepts", content: content.substring(Math.ceil(content.length / 4), Math.ceil(content.length / 2)) },
      { title: "Details", content: content.substring(Math.ceil(content.length / 2), Math.ceil(content.length * 3 / 4)) },
      { title: "Conclusion", content: content.substring(Math.ceil(content.length * 3 / 4)) }
    ];
  } catch (error) {
    console.error("Error splitting sections:", error);
    const partLength = Math.ceil(content.length / 4);
    return [
      { title: "Introduction", content: content.substring(0, partLength) },
      { title: "Main Concepts", content: content.substring(partLength, partLength * 2) },
      { title: "Details", content: content.substring(partLength * 2, partLength * 3) },
      { title: "Conclusion", content: content.substring(partLength * 3) }
    ];
  }
}

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

    // If regenerate, delete existing first
    if (regenerate) {
      console.log("Regenerating - deleting existing infographic...");
      await supabaseClient
        .from("infographics")
        .delete()
        .eq("chapter_id", chapterId);
    } else {
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

    const chapterName = chapter.name || chapter.name_kannada;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Split content into sections
    console.log("Splitting chapter into sections...");
    const sections = await splitIntoSections(chapter.content_extracted, chapterName, LOVABLE_API_KEY);
    console.log(`Created ${sections.length} sections`);

    // Generate infographic pages (always 4 pages, always with English text)
    const pagePromises = sections.slice(0, 4).map((section, idx) =>
      generateInfographicPage(
        section.content,
        section.title,
        idx + 1,
        4,
        LOVABLE_API_KEY
      )
    );

    const pageResults = await Promise.all(pagePromises);
    const imageUrls = pageResults.filter((url): url is string => url !== null);

    if (imageUrls.length === 0) {
      throw new Error("Failed to generate any infographic pages");
    }

    console.log(`Generated ${imageUrls.length} infographic pages`);

    // Store in database
    const { data: infographic, error: insertError } = await supabaseClient
      .from("infographics")
      .insert({
        chapter_id: chapterId,
        image_url: imageUrls[0],
        image_urls: imageUrls
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          infographic: { 
            chapter_id: chapterId, 
            image_url: imageUrls[0],
            image_urls: imageUrls 
          } 
        }),
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
