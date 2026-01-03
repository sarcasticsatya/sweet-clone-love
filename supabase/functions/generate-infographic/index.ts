import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Detect language from content
function detectLanguage(content: string, nameKannada: string): "kannada" | "hindi" | "english" {
  // Check for Kannada script (U+0C80-U+0CFF)
  if (nameKannada && /[\u0C80-\u0CFF]/.test(nameKannada)) {
    return "kannada";
  }
  // Check for Hindi/Devanagari script (U+0900-U+097F)
  if (/[\u0900-\u097F]/.test(content)) {
    return "hindi";
  }
  return "english";
}

// Generate visual diagram (no text) and extract key points in target language
async function generateInfographicPage(
  sectionContent: string,
  sectionTitle: string,
  pageNumber: number,
  totalPages: number,
  language: "kannada" | "hindi" | "english",
  apiKey: string
): Promise<{ imageUrl: string | null; keyPoints: string[]; title: string }> {
  try {
    console.log(`Generating infographic page ${pageNumber}/${totalPages}: ${sectionTitle}`);

    const languagePrompts = {
      kannada: {
        system: `Extract 4-5 KEY POINTS from this educational content.

CRITICAL: Return ALL points in KANNADA (ಕನ್ನಡ) language.
If content is in English, translate to Kannada.

Format: Return ONLY a JSON object:
{"points": ["ಮೊದಲ ಪ್ರಮುಖ ಅಂಶ", "ಎರಡನೆಯ ಪ್ರಮುಖ ಅಂಶ"], "title": "ವಿಭಾಗದ ಶೀರ್ಷಿಕೆ"}

Each point should be 5-15 words in Kannada.
Title should be the section topic in Kannada.`,
        fallback: ["ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೧", "ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೨", "ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೩"]
      },
      hindi: {
        system: `Extract 4-5 KEY POINTS from this educational content.

CRITICAL: Return ALL points in HINDI (हिन्दी) language.
If content is in English, translate to Hindi.
Use proper Devanagari script (देवनागरी).

Format: Return ONLY a JSON object:
{"points": ["पहला प्रमुख बिंदु", "दूसरा प्रमुख बिंदु"], "title": "खंड शीर्षक"}

Each point should be 5-15 words in Hindi.
Title should be the section topic in Hindi.`,
        fallback: ["प्रमुख अवधारणा १", "प्रमुख अवधारणा २", "प्रमुख अवधारणा ३"]
      },
      english: {
        system: `Extract 4-5 KEY POINTS from this educational content.

Format: Return ONLY a JSON object:
{"points": ["First key point", "Second key point"], "title": "Section Title"}

Each point should be 5-15 words.
Title should be the section topic.`,
        fallback: ["Key concept 1", "Key concept 2", "Key concept 3"]
      }
    };

    // Extract key points in target language
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
            content: languagePrompts[language].system
          },
          {
            role: "user",
            content: `Section: ${sectionTitle}\n\nContent:\n${sectionContent.substring(0, 4000)}`
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
    let localizedTitle = sectionTitle;
    
    try {
      const parsed = JSON.parse(summaryData.choices[0]?.message?.content || "{}");
      keyPoints = parsed.points || [];
      localizedTitle = parsed.title || sectionTitle;
    } catch {
      keyPoints = languagePrompts[language].fallback;
    }

    console.log(`${language} key points for page ${pageNumber}:`, keyPoints);

    // Generate VISUAL-ONLY diagram (NO TEXT in image)
    const imagePrompt = `Create a beautiful EDUCATIONAL DIAGRAM IMAGE.

TOPIC: ${sectionTitle} (Page ${pageNumber}/${totalPages})

STRICT REQUIREMENTS:
1. Create VISUAL DIAGRAMS and ILLUSTRATIONS ONLY
2. DO NOT include ANY text, labels, or words in the image
3. Use icons, symbols, flowcharts, and visual representations
4. Show concepts through images and diagrams
5. Use vibrant educational colors: blue, green, orange, purple
6. White/light background
7. Professional, clean educational poster style
8. Include relevant scientific/educational illustrations
9. Show relationships with arrows and connectors
10. Make it visually appealing and informative through imagery alone

IMPORTANT: This is a VISUAL-ONLY image. No text at all.
The text will be added separately.

Ultra high resolution educational diagram.`;

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

    let imageUrl: string | null = null;
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    } else {
      console.error(`Image generation failed for page ${pageNumber}`);
    }

    return { imageUrl, keyPoints, title: localizedTitle };
  } catch (error) {
    console.error(`Error generating page ${pageNumber}:`, error);
    return { imageUrl: null, keyPoints: [], title: sectionTitle };
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
            content: `Split the chapter content into 4 logical sections.

Return a JSON object:
{
  "sections": [
    { "title": "Section Title", "startPhrase": "first few words of this section" }
  ]
}

Rules:
- Create exactly 4 sections
- Each section should cover a distinct topic`
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

    const chapterName = chapter.name_kannada || chapter.name;
    const language = detectLanguage(chapter.content_extracted, chapter.name_kannada || "");
    console.log("DETECTED LANGUAGE:", language);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Split content into sections
    console.log("Splitting chapter into sections...");
    const sections = await splitIntoSections(chapter.content_extracted, chapterName, LOVABLE_API_KEY);
    console.log(`Created ${sections.length} sections`);

    // Generate infographic pages with language-specific key points
    const pagePromises = sections.slice(0, 4).map((section, idx) =>
      generateInfographicPage(
        section.content,
        section.title,
        idx + 1,
        4,
        language,
        LOVABLE_API_KEY
      )
    );

    const pageResults = await Promise.all(pagePromises);
    
    // Extract image URLs and localized data
    const imageUrls = pageResults.map(p => p.imageUrl).filter((url): url is string => url !== null);
    const localizedPages = pageResults.map((p, idx) => ({
      title: p.title,
      keyPoints: p.keyPoints,
      imageUrl: p.imageUrl
    }));

    if (imageUrls.length === 0 && localizedPages.every(p => p.keyPoints.length === 0)) {
      throw new Error("Failed to generate infographic content");
    }

    console.log(`Generated ${imageUrls.length} images and ${language} content for ${localizedPages.length} pages`);

    // Store in database with localized pages data
    const infographicData = {
      chapter_id: chapterId,
      image_url: imageUrls[0] || "",
      image_urls: imageUrls,
      kannada_pages: localizedPages, // Keep field name for backwards compatibility
      language: language
    };

    const { data: infographic, error: insertError } = await supabaseClient
      .from("infographics")
      .insert({
        chapter_id: chapterId,
        image_url: imageUrls[0] || "no-image",
        image_urls: infographicData
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ infographic: infographicData }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ infographic: { ...infographic, ...infographicData } }),
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
