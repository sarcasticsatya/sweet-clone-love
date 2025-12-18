import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Generate educational diagram for a quiz question
async function generateDiagramForQuestion(question: string, topic: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Generating diagram for:", question.substring(0, 40));
    
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a simple educational diagram for this quiz question.

Topic: ${topic}
Question context: ${question}

Requirements:
- Clean, simple educational illustration
- White background
- Clear visual representation of the concept
- NO TEXT - only visual elements, icons, diagrams
- Use simple shapes, arrows, and icons
- Educational poster style
- 2-3 colors maximum

Make it simple and clear. Ultra high resolution.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!imageResponse.ok) {
      console.error("Image generation failed for question");
      return null;
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    return imageUrl || null;
  } catch (error) {
    console.error("Error generating diagram:", error);
    return null;
  }
}

async function generateQuizFromAI(chapter: any, isKannadaChapter: boolean, apiKey: string, retryCount = 0): Promise<any> {
  const maxRetries = 2;
  
  const randomSeed = Math.floor(Math.random() * 1000000);
  const questionTypes = ["conceptual", "factual", "application-based", "analytical", "comparative"];
  const selectedTypes = questionTypes.sort(() => Math.random() - 0.5).slice(0, 3).join(", ");
  
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: isKannadaChapter 
            ? `You are a quiz generator. Generate exactly 15 UNIQUE multiple-choice questions in KANNADA (ಕನ್ನಡ).

Random seed: ${randomSeed}
Question types focus: ${selectedTypes}

Rules:
- Questions and options must be in Kannada script
- Each question has exactly 4 options
- correctAnswer is index 0-3
- Make questions DIFFERENT from previous generations
- Cover ALL aspects/topics from the content thoroughly
- Include mix of easy, medium, and hard questions

Return ONLY valid JSON:
{"questions":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","options":["ಆ","ಬ","ಸ","ದ"],"correctAnswer":0}]}`
            : `Generate exactly 15 UNIQUE multiple-choice questions in English.

Random seed: ${randomSeed}
Question types focus: ${selectedTypes}

Rules:
- Each question has exactly 4 options
- correctAnswer is index 0-3
- Make questions DIFFERENT from previous generations
- Cover ALL aspects/topics from the content thoroughly
- Include mix of easy, medium, and hard questions

Return ONLY valid JSON:
{"questions":[{"question":"Question?","options":["A","B","C","D"],"correctAnswer":0}]}`
        },
        {
          role: "user",
          content: `Generate 15 unique quiz questions from:\n\n${chapter.content_extracted.substring(0, 8000)}`
        }
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
      
      const allOptionsValid = q.options.every((opt: any) => 
        opt && typeof opt === "string" && opt.trim().length > 0
      );
      if (!allOptionsValid) return false;
      
      return true;
    });
    
    if (validQuestions.length < 10) {
      console.log("Only", validQuestions.length, "valid questions found, retrying...");
      throw new Error("Too few valid questions");
    }
    
    if (isKannadaChapter) {
      const allText = validQuestions.map((q: any) => q.question + q.options.join(" ")).join(" ");
      if (!/[\u0C80-\u0CFF]/.test(allText)) {
        throw new Error("No Kannada text found");
      }
    }
    
    return { questions: validQuestions };
  } catch (parseError) {
    console.error("Parse error:", parseError);
    if (retryCount < maxRetries) {
      console.log(`Retrying... attempt ${retryCount + 2}`);
      return generateQuizFromAI(chapter, isKannadaChapter, apiKey, retryCount + 1);
    }
    throw parseError;
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

    await supabaseClient.from("quizzes").delete().eq("chapter_id", chapterId);

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

    const isKannadaChapter = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);
    console.log("IS KANNADA CHAPTER:", isKannadaChapter);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const parsed = await generateQuizFromAI(chapter, isKannadaChapter, LOVABLE_API_KEY);
    
    console.log("Successfully parsed", parsed.questions.length, "questions");

    // Generate diagrams for ALL questions (in batches of 5 for rate limiting)
    const questionsWithDiagrams: any[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < parsed.questions.length; i += batchSize) {
      const batch = parsed.questions.slice(i, i + batchSize);
      console.log(`Generating diagrams for batch ${Math.floor(i/batchSize) + 1}`);
      
      const diagramPromises = batch.map((q: any) => 
        generateDiagramForQuestion(q.question, chapter.name, LOVABLE_API_KEY)
      );
      
      const diagramResults = await Promise.all(diagramPromises);
      
      batch.forEach((q: any, idx: number) => {
        questionsWithDiagrams.push({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          diagramUrl: diagramResults[idx] || null
        });
      });
    }

    const { data: quiz, error: insertError } = await supabaseClient
      .from("quizzes")
      .insert({
        chapter_id: chapterId,
        title: `${chapter.name_kannada || chapter.name} Quiz`,
        questions: questionsWithDiagrams,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save quiz" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ quiz }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
