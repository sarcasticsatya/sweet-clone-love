import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Helper function to safely parse JSON with recovery attempts
function safeParseJSON(content: string): any {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("Initial parse failed, attempting recovery...");
    
    // Try to find the last complete question and truncate there
    const questionsMatch = cleaned.match(/"questions"\s*:\s*\[/);
    if (questionsMatch) {
      // Find all complete question objects
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
      
      if (completeQuestions.length >= 5) {
        console.log(`Recovered ${completeQuestions.length} complete questions`);
        return { questions: completeQuestions };
      }
    }
    
    throw new Error("Could not parse quiz JSON: " + (e as Error).message);
  }
}

async function generateQuizFromAI(chapter: any, isKannadaChapter: boolean, apiKey: string, retryCount = 0): Promise<any> {
  const maxRetries = 2;
  
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
            ? `You are a quiz generator. Generate exactly 5 multiple-choice questions in KANNADA (ಕನ್ನಡ).

Rules:
- Questions and options must be in Kannada script
- Each question has exactly 4 options
- correctAnswer is index 0-3

Return ONLY valid JSON:
{"questions":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","options":["ಆ","ಬ","ಸ","ದ"],"correctAnswer":0}]}`
            : `Generate exactly 5 multiple-choice questions in English.
Each question has exactly 4 options. correctAnswer is index 0-3.

Return ONLY valid JSON:
{"questions":[{"question":"Question?","options":["A","B","C","D"],"correctAnswer":0}]}`
        },
        {
          role: "user",
          content: `Generate quiz from:\n\n${chapter.content_extracted.substring(0, 6000)}`
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
  console.log("AI Response preview:", content.substring(0, 400));
  
  try {
    const parsed = safeParseJSON(content);
    
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("No questions in response");
    }
    
    // Validate and clean questions
    const validQuestions = parsed.questions.filter((q: any) => {
      return q.question && 
             Array.isArray(q.options) && 
             q.options.length === 4 &&
             typeof q.correctAnswer === "number" &&
             q.correctAnswer >= 0 && 
             q.correctAnswer <= 3;
    });
    
    if (validQuestions.length < 3) {
      throw new Error("Too few valid questions");
    }
    
    // For Kannada chapters, verify Kannada text exists
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

    // Delete existing quiz
    await supabaseClient
      .from("quizzes")
      .delete()
      .eq("chapter_id", chapterId);

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

    // Detect Kannada by name_kannada field
    const isKannadaChapter = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);
    console.log("IS KANNADA CHAPTER:", isKannadaChapter);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const parsed = await generateQuizFromAI(chapter, isKannadaChapter, LOVABLE_API_KEY);
    
    console.log("Successfully parsed", parsed.questions.length, "questions");

    // Store quiz
    const { data: quiz, error: insertError } = await supabaseClient
      .from("quizzes")
      .insert({
        chapter_id: chapterId,
        title: `${chapter.name_kannada || chapter.name} Quiz`,
        questions: parsed.questions,
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
