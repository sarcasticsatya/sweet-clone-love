import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Generate a single infographic page
async function generateInfographicPage(
  sectionContent: string,
  sectionTitle: string,
  pageNumber: number,
  totalPages: number,
  isKannada: boolean,
  apiKey: string
): Promise<string | null> {
  try {
    console.log(`Generating infographic page ${pageNumber}/${totalPages}: ${sectionTitle}`);

    // First get a summary for the image prompt
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
            content: isKannada 
              ? `You are analyzing a section of a Kannada educational chapter.
Create a concise ENGLISH visual summary prompt for an educational infographic.
The infographic will have visual elements - focus on ICONS, DIAGRAMS, and ILLUSTRATIONS.
Return ONLY a single paragraph (max 150 words) describing what visual elements should appear.
Include: key concepts as visual elements, diagrams, flowcharts, or illustrations.
Focus on VISUAL elements that can be drawn clearly.`
              : `Create a concise visual summary prompt for an educational infographic section.
Return ONLY a single paragraph (max 150 words) describing what visual elements should appear.
Include: key concepts, diagrams, flowcharts, important facts with icons.
Focus on making it visually engaging and educational.`
          },
          {
            role: "user",
            content: `Section: ${sectionTitle}\n\nContent:\n${sectionContent.substring(0, 3000)}`
          }
        ]
      }),
    });

    if (!summaryResponse.ok) {
      throw new Error("Failed to generate summary");
    }

    const summaryData = await summaryResponse.json();
    const summaryPrompt = summaryData.choices[0]?.message?.content || "";

    // Generate the infographic image
    const imagePrompt = isKannada 
      ? `Create a beautiful educational infographic poster page (Page ${pageNumber} of ${totalPages}).
Section: "${sectionTitle}"

Style requirements:
- Clean, professional educational poster design
- Large clear header area (for section title)
- Visual hierarchy with icons and illustrations
- NO TEXT - only visual elements, diagrams, and icons
- Use arrows and flow lines to connect concepts
- Color scheme: educational tones (blues, greens, oranges)
- White or light background
- High contrast for readability
- Include 3-5 main visual concepts

Visual content to include:
${summaryPrompt}

Make it look like a premium study material page. Ultra high resolution. NO TEXT LABELS.`
      : `Create a beautiful educational infographic poster page (Page ${pageNumber} of ${totalPages}).
Section: "${sectionTitle}"

Style requirements:
- Clean, professional educational poster design
- Large header with section title at top
- Visual hierarchy with icons, diagrams, and text boxes
- Key facts in colored callout boxes
- Use arrows and flow lines to connect concepts
- Color scheme: educational tones (blues, greens, oranges)
- White or light background for readability
- Include 3-5 main concepts with clear labels

Content to visualize:
${summaryPrompt}

Make it look like a premium study poster. Include clear English text labels. Ultra high resolution.`;

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
            content: `You are an educational content organizer. Split the chapter content into 3-4 logical sections for creating a multi-page infographic.

Return a JSON object with sections array:
{
  "sections": [
    { "title": "Section Title", "startPhrase": "first few words of section" },
    { "title": "Section Title 2", "startPhrase": "first few words" }
  ]
}

Rules:
- Create exactly 3-4 sections
- Each section should cover a distinct topic/concept
- Titles should be clear and descriptive
- startPhrase should be unique identifying text from the content`
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
      // Fallback: split by equal parts
      const partLength = Math.ceil(content.length / 4);
      return [
        { title: "Introduction & Overview", content: content.substring(0, partLength) },
        { title: "Core Concepts", content: content.substring(partLength, partLength * 2) },
        { title: "Key Details", content: content.substring(partLength * 2, partLength * 3) },
        { title: "Summary & Applications", content: content.substring(partLength * 3) }
      ];
    }

    // Map sections to content
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
        // Fallback for this section
        const partLength = Math.ceil(content.length / result.sections.length);
        sections.push({
          title: section.title,
          content: content.substring(i * partLength, (i + 1) * partLength)
        });
      }
    }

    return sections.length > 0 ? sections : [
      { title: "Introduction & Overview", content: content.substring(0, Math.ceil(content.length / 4)) },
      { title: "Core Concepts", content: content.substring(Math.ceil(content.length / 4), Math.ceil(content.length / 2)) },
      { title: "Key Details", content: content.substring(Math.ceil(content.length / 2), Math.ceil(content.length * 3 / 4)) },
      { title: "Summary", content: content.substring(Math.ceil(content.length * 3 / 4)) }
    ];
  } catch (error) {
    console.error("Error splitting sections:", error);
    // Fallback
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Split content into sections
    console.log("Splitting chapter into sections...");
    const sections = await splitIntoSections(chapter.content_extracted, chapterName, LOVABLE_API_KEY);
    console.log(`Created ${sections.length} sections`);

    // Generate infographic pages in parallel (max 4)
    const pagePromises = sections.slice(0, 4).map((section, idx) =>
      generateInfographicPage(
        section.content,
        section.title,
        idx + 1,
        Math.min(sections.length, 4),
        isKannada,
        LOVABLE_API_KEY
      )
    );

    const pageResults = await Promise.all(pagePromises);
    const imageUrls = pageResults.filter((url): url is string => url !== null);

    if (imageUrls.length === 0) {
      throw new Error("Failed to generate any infographic pages");
    }

    console.log(`Generated ${imageUrls.length} infographic pages`);

    // Store in database (cache)
    const { data: infographic, error: insertError } = await supabaseClient
      .from("infographics")
      .insert({
        chapter_id: chapterId,
        image_url: imageUrls[0], // Primary image for backward compatibility
        image_urls: imageUrls // All pages
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // Still return the images even if caching fails
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
