import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json; charset=utf-8",
};

function safeParseJSON(content: string): any {
  let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("Initial parse failed, attempting recovery...");
    
    const completeQuestions: any[] = [];
    const questionRegex = /\{\s*"question"\s*:\s*"[^"]+"\s*,\s*"options"\s*:\s*\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*\]\s*,\s*"correctAnswer"\s*:\s*\d+\s*\}/g;
    
    let match;
    while ((match = questionRegex.exec(cleaned)) !== null) {
      try {
        const q = JSON.parse(match[0]);
        if (q.question && q.options?.length === 4 && typeof q.correctAnswer === "number") {
          completeQuestions.push(q);
        }
      } catch {
        // Skip invalid question
      }
    }
    
    if (completeQuestions.length >= 10) {
      console.log(`Recovered ${completeQuestions.length} complete questions`);
      return { questions: completeQuestions };
    }
    
    throw new Error("Could not parse quiz JSON: " + (e as Error).message);
  }
}

// Detect language - SUBJECT NAME takes priority over medium
function detectLanguage(medium: string, subjectName: string): "kannada" | "hindi" | "english" {
  const normalizedSubject = subjectName.toLowerCase();
  
  console.log(`Language detection - Medium: "${medium}", Subject: "${subjectName}"`);
  
  if (normalizedSubject.includes("kannada") || subjectName.includes("ಕನ್ನಡ")) {
    console.log("Result: kannada (Kannada subject)");
    return "kannada";
  }
  
  if (normalizedSubject.includes("hindi") || subjectName.includes("ಹಿಂದಿ")) {
    console.log("Result: hindi (Hindi subject)");
    return "hindi";
  }
  
  if (normalizedSubject.includes("english") || subjectName.includes("ಇಂಗ್ಲೀಷ")) {
    console.log("Result: english (English subject)");
    return "english";
  }
  
  if (medium === "English") {
    console.log("Result: english (English medium)");
    return "english";
  }
  
  console.log("Result: kannada (Kannada medium default)");
  return "kannada";
}

// Detect if extracted text is corrupted (garbled encoding from bad font mapping)
function isContentCorrupted(content: string, language: "kannada" | "hindi" | "english"): boolean {
  if (language === "english") return false; // English text won't have this issue
  
  // Sample first 2000 chars for analysis
  const sample = content.substring(0, 2000);
  
  if (language === "kannada") {
    // Kannada Unicode range: U+0C80-U+0CFF
    const kannadaChars = (sample.match(/[\u0C80-\u0CFF]/g) || []).length;
    // Latin chars that shouldn't dominate Kannada content
    const latinChars = (sample.match(/[A-Za-z]/g) || []).length;
    // Special garbled chars commonly seen in corrupted Kannada PDFs
    const garbledChars = (sample.match(/[À-ÿ]/g) || []).length;
    
    const total = sample.length;
    const kannadaRatio = kannadaChars / total;
    const garbledRatio = garbledChars / total;
    
    console.log(`Content analysis - Kannada chars: ${kannadaChars} (${(kannadaRatio * 100).toFixed(1)}%), Garbled: ${garbledChars} (${(garbledRatio * 100).toFixed(1)}%), Latin: ${latinChars}, Total: ${total}`);
    
    // If garbled chars dominate or almost no Kannada chars in what should be Kannada content
    if (garbledRatio > 0.1 || (kannadaRatio < 0.05 && latinChars > 50)) {
      console.log("DETECTED: Content is corrupted (garbled encoding)");
      return true;
    }
  }
  
  if (language === "hindi") {
    const hindiChars = (sample.match(/[\u0900-\u097F]/g) || []).length;
    const garbledChars = (sample.match(/[À-ÿ]/g) || []).length;
    const hindiRatio = hindiChars / sample.length;
    const garbledRatio = garbledChars / sample.length;
    
    if (garbledRatio > 0.1 || hindiRatio < 0.05) {
      console.log("DETECTED: Hindi content is corrupted");
      return true;
    }
  }
  
  return false;
}

async function generateQuizFromAI(
  chapter: any, 
  language: "kannada" | "hindi" | "english", 
  apiKey: string, 
  useTopicBased: boolean,
  retryCount = 0
): Promise<any> {
  const maxRetries = 2;
  
  const randomSeed = Math.floor(Math.random() * 1000000);
  const questionTypes = ["conceptual", "factual", "application-based", "analytical", "comparative"];
  const selectedTypes = questionTypes.sort(() => Math.random() - 0.5).slice(0, 3).join(", ");
  const shuffledAnswers = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  
  const chapterName = chapter.name_kannada || chapter.name;
  const subjectName = (chapter.subjects as any)?.name_kannada || (chapter.subjects as any)?.name || "";
  
  const topicContext = useTopicBased
    ? `\n\nIMPORTANT: Generate questions based on the topic "${chapterName}" from the Karnataka SSLC 10th standard "${subjectName}" textbook. Use your knowledge of this standard curriculum topic to create accurate, syllabus-aligned questions.`
    : "";

  // Detect if subject naturally uses English notation (maths, science)
  const subjectNameLower = subjectName.toLowerCase();
  const isMathOrScience = subjectNameLower.includes("math") || subjectNameLower.includes("ಗಣಿತ") || 
    subjectNameLower.includes("science") || subjectNameLower.includes("ವಿಜ್ಞಾನ");
  
  const kannadaMathNote = isMathOrScience 
    ? `\n- Mathematical symbols, numbers, and variables (x, y, n, etc.) in English/Latin are ALLOWED`
    : `\n- NO English characters allowed (no "Mt", "a", "b", "Q1", etc.)`;

  const systemPrompts = {
    kannada: `You are a quiz generator for Karnataka SSLC 10th standard curriculum. Generate exactly 15 UNIQUE multiple-choice questions.

LANGUAGE: KANNADA (ಕನ್ನಡ) - Primary language must be Kannada
- Questions MUST be primarily in Kannada script
- Options MUST be primarily in Kannada script${kannadaMathNote}
- Use Kannada numerals where appropriate: ೧, ೨, ೩, ೪

Random seed: ${randomSeed}
Question types focus: ${selectedTypes}
Subject: ${subjectName}
Chapter: ${chapterName}${topicContext}

CRITICAL: Randomize correctAnswer across ALL questions (use 0, 1, 2, 3 evenly distributed).
Do NOT always set correctAnswer to 0. Vary it: some 0, some 1, some 2, some 3.

Return ONLY valid JSON:
{"questions":[{"question":"ಪ್ರಶ್ನೆ?","options":["ಆಯ್ಕೆ ೧","ಆಯ್ಕೆ ೨","ಆಯ್ಕೆ ೩","ಆಯ್ಕೆ ೪"],"correctAnswer":${shuffledAnswers[0]}}]}`,
    hindi: `You are a quiz generator for Karnataka SSLC 10th standard curriculum. Generate exactly 15 UNIQUE multiple-choice questions.

LANGUAGE: STRICTLY HINDI (हिन्दी) ONLY
- Questions MUST be in Hindi/Devanagari script ONLY
- Options MUST be in Hindi/Devanagari script ONLY
- NO English characters allowed
- Use proper Hindi Unicode characters (U+0900-U+097F)
- Do NOT mix any English letters with Hindi text

Random seed: ${randomSeed}
Question types focus: ${selectedTypes}
Subject: ${subjectName}
Chapter: ${chapterName}${topicContext}

CRITICAL: Randomize correctAnswer across ALL questions (use 0, 1, 2, 3 evenly distributed).

Return ONLY valid JSON:
{"questions":[{"question":"हिंदी प्रश्न?","options":["अ","ब","स","द"],"correctAnswer":${shuffledAnswers[1]}}]}`,
    english: `Generate exactly 15 UNIQUE multiple-choice questions for Karnataka SSLC 10th standard curriculum in ENGLISH ONLY.

LANGUAGE: STRICTLY ENGLISH
- Questions and all options must be in English
- NO Kannada or Hindi text allowed
- Use proper English grammar and terminology

Random seed: ${randomSeed}
Question types focus: ${selectedTypes}
Subject: ${subjectName}
Chapter: ${chapterName}${topicContext}

CRITICAL: Randomize correctAnswer across ALL questions (use 0, 1, 2, 3 evenly distributed).

Return ONLY valid JSON:
{"questions":[{"question":"Question?","options":["Option A","Option B","Option C","Option D"],"correctAnswer":${shuffledAnswers[2]}}]}`
  };
  
  // Build user message based on whether content is usable
  const userMessage = useTopicBased
    ? `Generate 15 unique quiz questions about the topic "${chapterName}" from Karnataka SSLC 10th standard "${subjectName}". Create curriculum-aligned questions covering key concepts, definitions, formulas, and applications from this chapter.`
    : `Generate 15 unique quiz questions from:\n\n${chapter.content_extracted.substring(0, 8000)}`;

  console.log(`Generating quiz - Mode: ${useTopicBased ? 'TOPIC-BASED' : 'CONTENT-BASED'}, Language: ${language}, Chapter: ${chapterName}`);

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompts[language] },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI API error:", errText);
    throw new Error("AI API failed");
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices[0]?.message?.content || "";
  console.log("AI Response length:", content.length);
  
  try {
    const parsed = safeParseJSON(content);
    
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("No questions in response");
    }
    
    const validQuestions = parsed.questions.filter((q: any) => {
      if (!q.question || typeof q.question !== "string" || !q.question.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer > 3) return false;
      return q.options.every((opt: any) => opt && typeof opt === "string" && opt.trim().length > 0);
    });
    
    if (validQuestions.length < 10) {
      throw new Error(`Too few valid questions: ${validQuestions.length}`);
    }
    
    // Language validation
    const allText = validQuestions.map((q: any) => q.question + q.options.join(" ")).join(" ");
    
    if (language === "kannada") {
      if (!/[\u0C80-\u0CFF]/.test(allText)) throw new Error("No Kannada text found");
      // For math/science subjects, allow English chars (variables, formulas)
      // For language subjects, be strict
      const englishChars = (allText.match(/[a-zA-Z]/g) || []).length;
      const englishRatio = englishChars / allText.length;
      console.log(`Kannada validation: English chars: ${englishChars}, ratio: ${englishRatio.toFixed(3)}, isMathOrScience: ${isMathOrScience}`);
      const maxEnglishRatio = isMathOrScience ? 0.3 : 0.05;
      if (englishRatio > maxEnglishRatio) {
        console.log(`REJECTING: Too much English in Kannada output (${englishRatio.toFixed(3)} > ${maxEnglishRatio})`);
        throw new Error("Output contains too much English - regenerating");
      }
    }
    
    if (language === "hindi") {
      if (!/[\u0900-\u097F]/.test(allText)) throw new Error("No Hindi text found");
      if (/[a-zA-Z]/.test(allText)) {
        console.log("REJECTING: English characters in Hindi output");
        throw new Error("Output contains English characters - regenerating");
      }
    }
    
    if (language === "english") {
      const nonAsciiChars = (allText.match(/[^\x00-\x7F]/g) || []).length;
      const nonAsciiRatio = nonAsciiChars / allText.length;
      console.log(`English validation: non-ASCII ratio: ${nonAsciiRatio.toFixed(3)}`);
      if (nonAsciiRatio > 0.3) {
        throw new Error("Output mostly non-English - regenerating");
      }
    }
    
    return { questions: validQuestions };
  } catch (parseError) {
    console.error("Parse/validation error:", parseError);
    if (retryCount < maxRetries) {
      console.log(`Retrying... attempt ${retryCount + 2}`);
      return generateQuizFromAI(chapter, language, apiKey, useTopicBased, retryCount + 1);
    }
    throw parseError;
  }
}

// Check subject access
async function checkSubjectAccess(supabaseClient: any, userId: string, chapterId: string): Promise<{ hasAccess: boolean; isAdmin: boolean; subjectId: string | null }> {
  const { data: chapter } = await supabaseClient
    .from("chapters")
    .select("subject_id")
    .eq("id", chapterId)
    .single();

  if (!chapter) return { hasAccess: false, isAdmin: false, subjectId: null };

  const { data: roleData } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleData?.role === "admin") return { hasAccess: true, isAdmin: true, subjectId: chapter.subject_id };

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
    const { chapterId, regenerate = false } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!chapterId) {
      return new Response(JSON.stringify({ error: "Chapter ID is required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token || "");

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { hasAccess } = await checkSubjectAccess(supabaseClient, user.id, chapterId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied. Please purchase this course to access quizzes." }), { status: 403, headers: corsHeaders });
    }

    // CACHING: Check if quiz already exists
    if (!regenerate) {
      const { data: existingQuizzes, error: fetchError } = await supabaseClient
        .from("quizzes")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!fetchError && existingQuizzes && existingQuizzes.length > 0) {
        console.log(`Returning cached quiz for chapter ${chapterId}`);
        return new Response(JSON.stringify({ quiz: existingQuizzes[0], cached: true }), { headers: corsHeaders });
      }
    }

    // Delete existing quizzes if regenerating
    if (regenerate) {
      console.log("Regenerating quiz - deleting existing ones");
      await supabaseClient.from("quizzes").delete().eq("chapter_id", chapterId);
    }

    // Get chapter content with subject info
    const { data: chapter } = await supabaseClient
      .from("chapters")
      .select(`content_extracted, name, name_kannada, subjects!inner (name, name_kannada, medium)`)
      .eq("id", chapterId)
      .single();

    if (!chapter) {
      return new Response(JSON.stringify({ error: "Chapter not found" }), { status: 400, headers: corsHeaders });
    }

    const medium = (chapter.subjects as any)?.medium || "English";
    const subjectName = (chapter.subjects as any)?.name || "";
    const language = detectLanguage(medium, subjectName);
    console.log("LANGUAGE:", language, "| Medium:", medium, "| Subject:", subjectName);

    // Check if content is usable or corrupted
    const hasContent = chapter.content_extracted && chapter.content_extracted.length > 100;
    const corrupted = hasContent ? isContentCorrupted(chapter.content_extracted, language) : false;
    const useTopicBased = !hasContent || corrupted;
    
    if (useTopicBased) {
      console.log(`Using TOPIC-BASED generation (hasContent: ${hasContent}, corrupted: ${corrupted})`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const parsed = await generateQuizFromAI(chapter, language, LOVABLE_API_KEY, useTopicBased);
    console.log("Successfully generated", parsed.questions.length, "questions");

    const questionsToSave = parsed.questions.map((q: any) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      diagramUrl: null
    }));

    const { data: quiz, error: insertError } = await supabaseClient
      .from("quizzes")
      .insert({
        chapter_id: chapterId,
        title: `${chapter.name_kannada || chapter.name} Quiz`,
        questions: questionsToSave,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save quiz" }), { status: 500, headers: corsHeaders });
    }

    console.log(`Created quiz with ${questionsToSave.length} questions (${useTopicBased ? 'topic-based' : 'content-based'})`);
    return new Response(JSON.stringify({ quiz, cached: false }), { headers: corsHeaders });

  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
