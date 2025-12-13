import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, message, conversationHistory } = await req.json();

    if (!chapterId || !message) {
      return new Response(JSON.stringify({ error: "Chapter ID and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get chapter content
    const { data: chapter, error: chapterError } = await supabaseClient
      .from("chapters")
      .select("content_extracted, name, name_kannada")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return new Response(JSON.stringify({ error: "Chapter not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!chapter.content_extracted) {
      return new Response(
        JSON.stringify({
          error: "Chapter content not yet extracted. Please contact admin to process this PDF.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get videos with timestamps for this chapter
    const { data: videos } = await supabaseClient
      .from("videos")
      .select("id, title, title_kannada, timestamps")
      .eq("chapter_id", chapterId);

    // Build video reference context
    let videoContext = "";
    if (videos && videos.length > 0) {
      videoContext = "\n\nRELATED VIDEOS:\n";
      videos.forEach(video => {
        const videoTitle = video.title_kannada || video.title;
        videoContext += `- ${videoTitle}`;
        if (video.timestamps && Array.isArray(video.timestamps)) {
          const timestamps = video.timestamps as Array<{ time: string; label: string }>;
          if (timestamps.length > 0) {
            videoContext += ` (Timestamps: ${timestamps.map(t => `${t.time} - ${t.label}`).join(", ")})`;
          }
        }
        videoContext += "\n";
      });
    }

    const chapterName = chapter.name_kannada || chapter.name;

    // Detect if chapter is in Kannada (check if name_kannada exists and content has Kannada script)
    const isKannadaChapter = chapter.name_kannada && /[\u0C80-\u0CFF]/.test(chapter.content_extracted || "");
    
    // Build system prompt with strict source-bound rules and clean markdown output
    const systemPrompt = `You are an AI tutor for Karnataka SSLC students with EXPERT knowledge of Kannada language. Follow these STRICT rules:

1. ANSWER ONLY FROM THE PROVIDED CHAPTER CONTENT - Provide DETAILED, COMPREHENSIVE explanations by default
2. If the question is NOT answerable from the chapter content, respond EXACTLY with:
   ${isKannadaChapter ? '"ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಅಧ್ಯಾಯವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತೆ ಕೇಳಿ."' : '"This chapter does not contain that information. Please select the correct chapter and ask again."'}
3. LANGUAGE HANDLING (CRITICAL):
   ${isKannadaChapter 
     ? '- This is a KANNADA chapter - You MUST respond ENTIRELY in Kannada (ಕನ್ನಡ) REGARDLESS of the language the student uses\n   - Even if student asks in English, translate their question and respond in fluent, natural Kannada\n   - Use proper Kannada script (ಕನ್ನಡ ಲಿಪಿ) with correct grammar' 
     : '- If student asks in Kannada (ಕನ್ನಡ), respond ENTIRELY in fluent, natural Kannada\n   - If student asks in English, respond in English\n   - Use proper Kannada script (ಕನ್ನಡ ಲಿಪಿ) with correct grammar when using Kannada'}
   - Maintain cultural context appropriate for Karnataka SSLC students
4. RESPONSE STYLE (CRITICAL):
   - Provide DETAILED, IN-DEPTH explanations (not just point-wise answers)
   - Break down complex concepts step-by-step
   - Include examples and context where relevant
   - Explain the reasoning behind answers
   - For equations, show step-by-step derivation or solution process
5. FORMATTING (ABSOLUTE REQUIREMENTS):
   - Use clean Markdown ONLY: headings (## ###), bullet points (-), bold (**text**), italic (*text*)
   - For mathematical expressions, ALWAYS use plain text: "x^2 + 5x + 6", "Area = πr^2", "E = mc^2"
   - NEVER use LaTeX delimiters: NO $ or $$ symbols anywhere
   - NEVER use \( \) or \[ \] notation
   - Write equations naturally in the text like: "The formula is x^2 + 5x + 6"
   - Keep formatting clean and readable for school students
6. ALWAYS conclude with a **Summary** or **Final Answer** section
7. VIDEO REFERENCES: When your answer relates to topics covered in the available videos, include a reference like:
   📹 Watch: [Video Title] at [timestamp] for visual explanation
   Only reference videos that are actually relevant to the question.
${videoContext}
CHAPTER: ${chapterName}
CHAPTER CONTENT:
${chapter.content_extracted}`;

    // Prepare messages for AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let aiMessage = aiData.choices[0]?.message?.content || "I couldn't generate a response.";
    
    // Post-process to remove any LaTeX delimiters that might have slipped through
    aiMessage = aiMessage
      .replace(/\$\$([^$]+)\$\$/g, '$1')  // Remove $$...$$ blocks
      .replace(/\$([^$]+)\$/g, '$1')      // Remove $...$ inline
      .replace(/\\\[([^\]]+)\\\]/g, '$1') // Remove \[...\] blocks
      .replace(/\\\(([^\)]+)\\\)/g, '$1') // Remove \(...\) inline
      .trim();

    return new Response(JSON.stringify({ response: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat-with-chapter:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
