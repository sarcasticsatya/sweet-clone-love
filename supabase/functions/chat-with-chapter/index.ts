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
      return new Response(
        JSON.stringify({ error: "Chapter ID and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get chapter content
    const { data: chapter, error: chapterError } = await supabaseClient
      .from("chapters")
      .select("content_extracted, name, name_kannada")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return new Response(
        JSON.stringify({ error: "Chapter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chapter.content_extracted) {
      return new Response(
        JSON.stringify({ 
          error: "Chapter content not yet extracted. Please contact admin to process this PDF." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chapterName = chapter.name_kannada || chapter.name;

    // Build system prompt with strict source-bound rules and strong Kannada support
    const systemPrompt = `You are an AI tutor for Karnataka SSLC students with EXPERT knowledge of Kannada language. Follow these STRICT rules:

1. ANSWER ONLY FROM THE PROVIDED CHAPTER CONTENT
2. If the question is NOT answerable from the chapter content, respond EXACTLY with:
   "This chapter does not contain that information. Please select the correct chapter and ask again."
3. LANGUAGE HANDLING (CRITICAL):
   - If student asks in Kannada (ಕನ್ನಡ), respond ENTIRELY in fluent, natural Kannada
   - If student asks in English, respond in English
   - Use proper Kannada script (ಕನ್ನಡ ಲಿಪಿ) with correct grammar
   - Maintain cultural context appropriate for Karnataka SSLC students
4. Use clean Markdown formatting
5. Do NOT use inline math like $...$ - use fenced blocks instead:
   $$
   equation here
   $$
6. ALWAYS end your response with:
   ## Final Answer
   **[your concise answer here]**

CHAPTER: ${chapterName}
CHAPTER CONTENT:
${chapter.content_extracted}`;

    // Prepare messages for AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ response: aiMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chat-with-chapter:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
