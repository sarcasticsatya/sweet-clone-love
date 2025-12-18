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
    console.log("JSON parse failed, attempting recovery...");
    
    const flashcards: any[] = [];
    const cardRegex = /\{\s*"question"\s*:\s*"([^"]+)"\s*,\s*"answer"\s*:\s*"([^"]+)"\s*\}/g;
    
    let match;
    while ((match = cardRegex.exec(cleaned)) !== null) {
      flashcards.push({
        question: match[1],
        answer: match[2]
      });
    }
    
    if (flashcards.length >= 5) {
      console.log(`Recovered ${flashcards.length} flashcards`);
      return { flashcards };
    }
    
    throw new Error("Could not parse flashcards JSON");
  }
}

// Generate educational image for a flashcard
async function generateImageForFlashcard(question: string, answer: string, topic: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Generating image for flashcard:", question.substring(0, 30));
    
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
            content: `Create a simple educational diagram/illustration for this flashcard concept.

Topic: ${topic}
Concept: ${question}
Answer hint: ${answer.substring(0, 100)}

Requirements:
- Clean, simple educational illustration
- White background
- Visual representation of the concept
- NO TEXT - only visual elements, diagrams, icons
- Use simple shapes and clear visuals
- Educational style like a textbook diagram
- 2-3 colors maximum

Make it simple, clear, and educational. Ultra high resolution.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!imageResponse.ok) {
      console.error("Image generation failed");
      return null;
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    return imageUrl || null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

async function generateFlashcardsFromAI(chapter: any, isKannadaChapter: boolean, apiKey: string, retryCount = 0): Promise<any> {
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
            ? `Generate exactly 10 flashcards in KANNADA (ಕನ್ನಡ).

Rules:
- Questions and answers must be in Kannada script
- Use Kannada Unicode characters (U+0C80-U+0CFF)
- Cover key concepts from the chapter

Return ONLY valid JSON:
{"flashcards":[{"question":"ಕನ್ನಡ ಪ್ರಶ್ನೆ?","answer":"ಕನ್ನಡ ಉತ್ತರ"}]}`
            : `Generate exactly 10 flashcards in English.

Rules:
- Cover key concepts from the chapter
- Questions should test understanding
- Answers should be concise but complete

Return ONLY valid JSON:
{"flashcards":[{"question":"Question?","answer":"Answer"}]}`
        },
        {
          role: "user",
          content: `Generate 10 flashcards from:\n\n${chapter.content_extracted.substring(0, 6000)}`
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
  console.log("AI Response preview:", content.substring(0, 300));
  
  try {
    const parsed = safeParseJSON(content);
    
    if (!parsed.flashcards || !Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      throw new Error("No flashcards in response");
    }
    
    const validCards = parsed.flashcards.filter((fc: any) => 
      fc.question && typeof fc.question === "string" && 
      fc.answer && typeof fc.answer === "string"
    );
    
    if (validCards.length < 3) {
      throw new Error("Too few valid flashcards");
    }
    
    if (isKannadaChapter) {
      const allText = validCards.map((fc: any) => fc.question + fc.answer).join(" ");
      if (!/[\u0C80-\u0CFF]/.test(allText)) {
        throw new Error("No Kannada text found");
      }
    }
    
    return { flashcards: validCards };
  } catch (parseError) {
    console.error("Parse error:", parseError);
    if (retryCount < maxRetries) {
      console.log(`Retrying... attempt ${retryCount + 2}`);
      return generateFlashcardsFromAI(chapter, isKannadaChapter, apiKey, retryCount + 1);
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

    // Delete existing flashcards
    await supabaseClient
      .from("flashcards")
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

    const isKannadaChapter = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.name_kannada);
    console.log("IS KANNADA CHAPTER:", isKannadaChapter);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const parsed = await generateFlashcardsFromAI(chapter, isKannadaChapter, LOVABLE_API_KEY);
    
    console.log("Successfully parsed", parsed.flashcards.length, "flashcards");

    // Generate images for ALL flashcards (in batches of 4)
    const flashcardsWithImages: any[] = [];
    const batchSize = 4;
    
    for (let i = 0; i < parsed.flashcards.length; i += batchSize) {
      const batch = parsed.flashcards.slice(i, i + batchSize);
      console.log(`Generating images for flashcard batch ${Math.floor(i/batchSize) + 1}`);
      
      const imagePromises = batch.map((fc: any) => 
        generateImageForFlashcard(fc.question, fc.answer, chapter.name, LOVABLE_API_KEY)
      );
      
      const imageResults = await Promise.all(imagePromises);
      
      batch.forEach((fc: any, idx: number) => {
        flashcardsWithImages.push({
          chapter_id: chapterId,
          question: fc.question,
          answer: fc.answer,
          image_url: imageResults[idx] || null,
          created_by: user.id
        });
      });
    }

    const { data: insertedFlashcards, error: insertError } = await supabaseClient
      .from("flashcards")
      .insert(flashcardsWithImages)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save flashcards" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ flashcards: insertedFlashcards }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in generate-flashcards:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
