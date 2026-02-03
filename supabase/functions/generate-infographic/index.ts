import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Detect language - SUBJECT NAME takes priority over medium
function detectLanguage(medium: string, subjectName: string): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  console.log(`Language detection - Medium: "${medium}", Subject: "${subjectName}"`);
  
  // PRIORITY 1: Subject-specific language (applies regardless of medium)
  // Kannada subject in ANY medium → Kannada
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    console.log("Result: kannada (Kannada subject - subject name takes priority)");
    return "kannada";
  }
  
  // Hindi subject in ANY medium → Hindi
  if (normalizedSubject.includes("hindi") || subjectName.includes("ಹಿಂದಿ")) {
    console.log("Result: hindi (Hindi subject - subject name takes priority)");
    return "hindi";
  }
  
  // PRIORITY 2: Medium-based default for other subjects
  if (medium === "English") {
    console.log("Result: english (English medium, non-language subject)");
    return "english";
  }
  
  // Kannada Medium (for subjects like ಗಣಿತ, ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ, ಇಂಗ್ಲೀಷ)
  console.log("Result: kannada (Kannada medium)");
  return "kannada";
}

// Extract key points only (fast operation) - NO IMAGE GENERATION
async function extractKeyPoints(
  sectionContent: string,
  sectionTitle: string,
  pageNumber: number,
  language: "kannada" | "hindi" | "english",
  apiKey: string
): Promise<{ keyPoints: string[]; title: string }> {
  try {
    console.log(`Extracting key points for page ${pageNumber}: ${sectionTitle}`);

    const languagePrompts = {
      kannada: {
        system: `Extract 4-5 KEY POINTS from this educational content.

LANGUAGE: STRICTLY KANNADA (ಕನ್ನಡ) ONLY
- Return ALL points in Kannada script ONLY
- NO English characters allowed (no "Mt", "a", "b", etc.)
- If content is in English, translate to Kannada

Format: Return ONLY a JSON object:
{"points": ["ಮೊದಲ ಪ್ರಮುಖ ಅಂಶ", "ಎರಡನೆಯ ಪ್ರಮುಖ ಅಂಶ"], "title": "ವಿಭಾಗದ ಶೀರ್ಷಿಕೆ"}
Each point should be 5-15 words in Kannada.`,
        fallback: ["ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೧", "ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೨", "ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ ೩"]
      },
      hindi: {
        system: `Extract 4-5 KEY POINTS from this educational content.

LANGUAGE: STRICTLY HINDI (हिन्दी) ONLY
- Return ALL points in Hindi/Devanagari script ONLY
- NO English characters allowed
- If content is in English, translate to Hindi

Format: Return ONLY a JSON object:
{"points": ["पहला प्रमुख बिंदु", "दूसरा प्रमुख बिंदु"], "title": "खंड शीर्षक"}
Each point should be 5-15 words in Hindi.`,
        fallback: ["प्रमुख अवधारणा १", "प्रमुख अवधारणा २", "प्रमुख अवधारणा ३"]
      },
      english: {
        system: `Extract 4-5 KEY POINTS from this educational content.

LANGUAGE: STRICTLY ENGLISH
- Return ALL points in English ONLY
- NO Kannada or Hindi text allowed

Format: Return ONLY a JSON object:
{"points": ["First key point", "Second key point"], "title": "Section Title"}
Each point should be 5-15 words.`,
        fallback: ["Key concept 1", "Key concept 2", "Key concept 3"]
      }
    };

    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: languagePrompts[language].system },
          { role: "user", content: `Section: ${sectionTitle}\n\nContent:\n${sectionContent.substring(0, 4000)}` }
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

    return { keyPoints, title: localizedTitle };
  } catch (error) {
    console.error(`Error extracting key points for page ${pageNumber}:`, error);
    return { keyPoints: [], title: sectionTitle };
  }
}

// Generate image for a page (slow operation)
async function generateImage(
  sectionTitle: string,
  pageNumber: number,
  totalPages: number,
  apiKey: string
): Promise<string | null> {
  try {
    console.log(`Generating image for page ${pageNumber}/${totalPages}`);

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
IMPORTANT: This is a VISUAL-ONLY image. No text at all.
Ultra high resolution educational diagram.`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"]
      }),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      return imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    }
    
    console.error(`Image generation failed for page ${pageNumber}`);
    return null;
  } catch (error) {
    console.error(`Error generating image for page ${pageNumber}:`, error);
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
            content: `Split the chapter content into 2 logical sections.
Return a JSON object:
{
  "sections": [
    { "title": "Section Title", "startPhrase": "first few words of this section" }
  ]
}
Rules:
- Create exactly 2 sections
- Each section should cover a distinct topic`
          },
          { role: "user", content: `Chapter: ${chapterName}\n\nContent:\n${content.substring(0, 8000)}` }
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
      const partLength = Math.ceil(content.length / 2);
      return [
        { title: "Key Concepts", content: content.substring(0, partLength) },
        { title: "Summary", content: content.substring(partLength) }
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
        sections.push({ title: section.title, content: content.substring(startIdx, endIdx) });
      } else {
        const partLength = Math.ceil(content.length / result.sections.length);
        sections.push({ title: section.title, content: content.substring(i * partLength, (i + 1) * partLength) });
      }
    }

    return sections.length > 0 ? sections : [
      { title: "Key Concepts", content: content.substring(0, Math.ceil(content.length / 2)) },
      { title: "Summary", content: content.substring(Math.ceil(content.length / 2)) }
    ];
  } catch (error) {
    console.error("Error splitting sections:", error);
    const partLength = Math.ceil(content.length / 2);
    return [
      { title: "Key Concepts", content: content.substring(0, partLength) },
      { title: "Summary", content: content.substring(partLength) }
    ];
  }
}

// Helper function to check subject access
async function checkSubjectAccess(supabaseClient: any, userId: string, chapterId: string): Promise<{ hasAccess: boolean; isAdmin: boolean; subjectId: string | null }> {
  // Get chapter's subject_id
  const { data: chapter } = await supabaseClient
    .from("chapters")
    .select("subject_id")
    .eq("id", chapterId)
    .single();

  if (!chapter) {
    return { hasAccess: false, isAdmin: false, subjectId: null };
  }

  // Check if user is admin
  const { data: roleData } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleData?.role === "admin") {
    return { hasAccess: true, isAdmin: true, subjectId: chapter.subject_id };
  }

  // Check if user has access to this subject
  const { data: accessData } = await supabaseClient
    .from("student_subject_access")
    .select("id")
    .eq("student_id", userId)
    .eq("subject_id", chapter.subject_id)
    .single();

  return { hasAccess: !!accessData, isAdmin: false, subjectId: chapter.subject_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, regenerate, mode = "full" } = await req.json();
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

    // Check subject access
    const { hasAccess } = await checkSubjectAccess(supabaseClient, user.id, chapterId);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied. Please purchase this course to access infographics." }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Mode: "poll" - just return current state from DB
    if (mode === "poll") {
      const { data: existing } = await supabaseClient
        .from("infographics")
        .select("*")
        .eq("chapter_id", chapterId)
        .single();

      if (existing) {
        const storedData = existing.image_urls as any;
        return new Response(
          JSON.stringify({ 
            infographic: {
              ...existing,
              kannada_pages: storedData?.kannada_pages || [],
              images_pending: existing.images_pending || false
            }
          }),
          { headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({ infographic: null }),
        { headers: corsHeaders }
      );
    }

    // If regenerate, delete existing first
    if (regenerate) {
      console.log("Regenerating - deleting existing infographic...");
      await supabaseClient.from("infographics").delete().eq("chapter_id", chapterId);
    } else {
      // Check for existing complete infographic (cached)
      const { data: existing } = await supabaseClient
        .from("infographics")
        .select("*")
        .eq("chapter_id", chapterId)
        .single();

      if (existing && !existing.images_pending) {
        console.log("Returning cached infographic");
        const storedData = existing.image_urls as any;
        return new Response(
          JSON.stringify({ 
            infographic: {
              ...existing,
              kannada_pages: storedData?.kannada_pages || [],
              images_pending: false
            }
          }),
          { headers: corsHeaders }
        );
      }
    }

    // Get chapter content with subject info including medium
    const { data: chapter } = await supabaseClient
      .from("chapters")
      .select(`
        content_extracted, 
        name, 
        name_kannada,
        subjects!inner (
          name,
          name_kannada,
          medium
        )
      `)
      .eq("id", chapterId)
      .single();

    if (!chapter || !chapter.content_extracted) {
      return new Response(
        JSON.stringify({ error: "Chapter content not available" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const chapterName = chapter.name_kannada || chapter.name;
    
    // Use medium-based language detection
    const medium = (chapter.subjects as any)?.medium || "English";
    const subjectName = (chapter.subjects as any)?.name || "";
    const language = detectLanguage(medium, subjectName);
    console.log("DETECTED LANGUAGE:", language, "| Medium:", medium, "| Subject:", subjectName);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // PHASE 1: Quick mode - extract key points only (returns in ~2-3 seconds)
    console.log("Splitting chapter into sections...");
    const sections = await splitIntoSections(chapter.content_extracted, chapterName, LOVABLE_API_KEY);
    console.log(`Created ${sections.length} sections`);

    // Extract key points for all sections in parallel (fast)
    const keyPointsPromises = sections.slice(0, 2).map((section, idx) =>
      extractKeyPoints(section.content, section.title, idx + 1, language, LOVABLE_API_KEY)
    );
    const keyPointsResults = await Promise.all(keyPointsPromises);

    // Create initial pages with key points but no images
    const initialPages = keyPointsResults.map((result, idx) => ({
      title: result.title,
      keyPoints: result.keyPoints,
      imageUrl: null as string | null
    }));

    // Store initial data with images_pending = true
    const initialData = {
      chapter_id: chapterId,
      image_url: "pending",
      image_urls: {
        image_urls: [],
        kannada_pages: initialPages,
        language: language
      },
      images_pending: true,
      pages_data: initialPages
    };

    // Insert/update with pending state
    const { data: insertedInfographic, error: insertError } = await supabaseClient
      .from("infographics")
      .upsert({
        chapter_id: chapterId,
        image_url: "pending",
        image_urls: initialData.image_urls,
        images_pending: true,
        pages_data: initialPages
      }, { onConflict: 'chapter_id' })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // If mode is "quick", return immediately with key points
    if (mode === "quick") {
      console.log("Quick mode: returning key points immediately");
      return new Response(
        JSON.stringify({ 
          infographic: {
            chapter_id: chapterId,
            image_url: "pending",
            kannada_pages: initialPages,
            images_pending: true
          }
        }),
        { headers: corsHeaders }
      );
    }

    // PHASE 2: Full mode - generate images (takes ~6-8 seconds with 2 pages)
    console.log("Generating images for all pages...");
    const imagePromises = sections.slice(0, 2).map((section, idx) =>
      generateImage(section.title, idx + 1, 2, LOVABLE_API_KEY)
    );
    const imageResults = await Promise.all(imagePromises);

    // Update pages with images
    const finalPages = initialPages.map((page, idx) => ({
      ...page,
      imageUrl: imageResults[idx]
    }));

    const imageUrls = imageResults.filter((url): url is string => url !== null);

    // Update database with complete data
    const finalData = {
      image_urls: imageUrls,
      kannada_pages: finalPages,
      language: language
    };

    const { error: updateError } = await supabaseClient
      .from("infographics")
      .update({
        image_url: imageUrls[0] || "no-image",
        image_urls: finalData,
        images_pending: false,
        pages_data: finalPages
      })
      .eq("chapter_id", chapterId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    console.log(`Generated ${imageUrls.length} images for ${finalPages.length} pages`);

    return new Response(
      JSON.stringify({ 
        infographic: {
          chapter_id: chapterId,
          image_url: imageUrls[0] || "no-image",
          kannada_pages: finalPages,
          images_pending: false
        }
      }),
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
