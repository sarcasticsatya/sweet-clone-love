import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json; charset=utf-8",
};

// Detect language - SUBJECT NAME takes priority over medium (v3 - Unicode normalized)
function detectLanguage(medium: string, subjectName: string): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  console.log(`[v3] Language detection - Medium: "${medium}", Subject: "${subjectName}", Codepoints: ${Array.from(subjectName).map(c => c.codePointAt(0)).join(',')}`);
  
  const codepoints = Array.from(subjectName).map(c => c.codePointAt(0) || 0);
  
  // Kannada subject: ಕ(0C95) ನ(0CA8) = start of ಕನ್ನಡ
  if (normalizedSubject.includes("kannada") || (codepoints[0] === 0x0C95 && codepoints[1] === 0x0CA8)) {
    console.log("Result: kannada (Kannada subject - subject name takes priority)");
    return "kannada";
  }
  
  // Hindi subject: ಹ(0CB9) ಿ(0CBF) = start of ಹಿಂದಿ
  if (normalizedSubject.includes("hindi") || (codepoints[0] === 0x0CB9 && codepoints[1] === 0x0CBF)) {
    console.log("Result: hindi (Hindi subject - subject name takes priority)");
    return "hindi";
  }
  
  // English subject: ಇ(0C87) ಂ(0C82) ಗ(0C97) = start of ಇಂಗ್ಲೀಷ
  const isEnglishKannada = codepoints[0] === 0x0C87 && codepoints[1] === 0x0C82 && codepoints[2] === 0x0C97;
  if (normalizedSubject.includes("english") || isEnglishKannada) {
    console.log("Result: english (English subject - subject name takes priority)");
    return "english";
  }
  
  // PRIORITY 2: Medium-based default for other subjects
  if (medium === "English") {
    console.log("Result: english (English medium, non-language subject)");
    return "english";
  }
  
  console.log("Result: kannada (Kannada medium)");
  return "kannada";
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
    const { chapterId, regenerate } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: "Chapter ID is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const user = { id: claimsData.claims.sub as string };

    // Check subject access
    const { hasAccess } = await checkSubjectAccess(supabaseClient, user.id, chapterId);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied. Please purchase this course to access mindmaps." }),
        { status: 403, headers: corsHeaders }
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
        // Return cached if it's the new structure format
        if (data?.type && data?.structure) {
          console.log("Returning cached mindmap structure");
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
    
    // Use medium-based language detection
    const medium = (chapter.subjects as any)?.medium || "English";
    const subjectName = (chapter.subjects as any)?.name || "";
    const language = detectLanguage(medium, subjectName);
    console.log("DETECTED LANGUAGE:", language, "| Medium:", medium, "| Subject:", subjectName);

    // Build language-specific prompt
    const languagePrompts = {
      kannada: `Create a hierarchical mind map structure for an educational chapter.

LANGUAGE: STRICTLY KANNADA (ಕನ್ನಡ) ONLY
- ALL text MUST be in Kannada script ONLY
- NO English characters allowed (no "Mt", "a", "b", etc.)
- If the content is in English, translate everything to Kannada
- Use proper Kannada Unicode script (ಕನ್ನಡ ಅಕ್ಷರಗಳು)

Return a JSON object:
{
  "title": "ಮುಖ್ಯ ವಿಷಯ",
  "branches": [
    {
      "name": "ಶಾಖೆ ೧",
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
- Assign different colors to each branch: #3b82f6 (blue), #10b981 (green), #f59e0b (orange), #8b5cf6 (purple), #ef4444 (red), #06b6d4 (teal)`,
      hindi: `Create a hierarchical mind map structure for an educational chapter.

LANGUAGE: STRICTLY HINDI (हिन्दी) ONLY
- ALL text MUST be in Hindi/Devanagari script ONLY
- NO English characters allowed
- If the content is in English, translate everything to Hindi
- Use proper Devanagari script (देवनागरी लिपि)

Return a JSON object:
{
  "title": "मुख्य विषय",
  "branches": [
    {
      "name": "शाखा १",
      "color": "#3b82f6",
      "subbranches": ["उपशाखा १", "उपशाखा २"]
    }
  ]
}

Rules:
- Title should be the main chapter topic IN HINDI
- Create 4-6 main branches with Hindi names
- Each branch should have 2-4 subbranches in Hindi
- Keep text concise (2-6 words in Hindi per item)
- Assign different colors to each branch: #3b82f6 (blue), #10b981 (green), #f59e0b (orange), #8b5cf6 (purple), #ef4444 (red), #06b6d4 (teal)
- Use proper Hindi Unicode script (U+0900-U+097F)`,
      english: `Create a hierarchical mind map structure for an educational chapter.

LANGUAGE: STRICTLY ENGLISH
- ALL text MUST be in English ONLY
- NO Kannada or Hindi text allowed
- Use proper English grammar and terminology

Return a JSON object:
{
  "title": "Main Topic",
  "branches": [
    {
      "name": "Branch 1",
      "color": "#3b82f6",
      "subbranches": ["Subbranch 1", "Subbranch 2"]
    }
  ]
}

Rules:
- Title should be the main chapter topic
- Create 4-6 main branches
- Each branch should have 2-4 subbranches
- Keep text concise (2-6 words per item)
- Assign different colors to each branch: #3b82f6 (blue), #10b981 (green), #f59e0b (orange), #8b5cf6 (purple), #ef4444 (red), #06b6d4 (teal)`
    };

    // Generate mindmap structure
    console.log(`Generating ${language} mindmap structure...`);
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
            content: languagePrompts[language]
          },
          {
            role: "user",
            content: `Create a mindmap structure for this chapter:\n\nChapter: ${chapterName}\n\nContent:\n${chapter.content_extracted.substring(0, 8000)}`
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

    console.log(`${language} mindmap structure generated:`, JSON.stringify(structure).substring(0, 500));

    // Store with language type
    const mindmapData = {
      type: `${language}-structure`,
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
