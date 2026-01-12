import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detect language from content with subject-based priority
function detectLanguage(content: string, nameKannada: string, subjectName: string): "kannada" | "hindi" | "english" {
  // First priority: Check subject name for Hindi
  // "ಹಿಂದಿ" is "Hindi" written in Kannada script
  if (subjectName && (
    subjectName.toLowerCase().includes('hindi') || 
    subjectName === 'ಹಿಂದಿ'
  )) {
    console.log("Detected HINDI from subject name:", subjectName);
    return "hindi";
  }
  
  // Check for Hindi/Devanagari script in content (U+0900-U+097F)
  if (/[\u0900-\u097F]/.test(content)) {
    return "hindi";
  }
  
  // Check for Kannada script (U+0C80-U+0CFF)
  if (nameKannada && /[\u0C80-\u0CFF]/.test(nameKannada)) {
    return "kannada";
  }
  
  return "english";
}

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

    // Get chapter content with subject info
    const { data: chapter, error: chapterError } = await supabaseClient
      .from("chapters")
      .select(`
        content_extracted, 
        name, 
        name_kannada,
        subjects!inner (
          name,
          name_kannada
        )
      `)
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
    const subjectName = (chapter.subjects as any)?.name || (chapter.subjects as any)?.name_kannada || "";

    // Detect language
    const language = detectLanguage(chapter.content_extracted, chapter.name_kannada || "", subjectName);
    console.log("DETECTED LANGUAGE:", language);

    // Build language-specific instructions
    const languageInstructions = {
      kannada: {
        notFound: '"ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಅಧ್ಯಾಯವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತೆ ಕೇಳಿ."',
        rules: `- This is a KANNADA chapter - You MUST respond ENTIRELY in Kannada (ಕನ್ನಡ) REGARDLESS of the language the student uses
   - CRITICAL: Even if the student asks in HINDI (हिन्दी), you MUST respond ONLY in Kannada
   - CRITICAL: Even if the student asks in ENGLISH, you MUST respond ONLY in Kannada
   - NEVER respond in Hindi or English for Kannada chapters - ALWAYS use Kannada
   - The response language is determined by the SUBJECT, not the student's question language
   - Translate the student's question mentally and answer in Kannada
   - Use proper Kannada script (ಕನ್ನಡ ಲಿಪಿ) with correct grammar`
      },
      hindi: {
        notFound: '"इस अध्याय में वह जानकारी नहीं है। कृपया सही अध्याय चुनें और फिर से पूछें। / ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ। / This chapter does not contain that information."',
        rules: `- This is a HINDI chapter - You MUST respond in ALL THREE LANGUAGES: Hindi, Kannada, AND English
   - Structure your response with clear sections for each language
   - First provide the answer in Hindi (हिन्दी) with proper Devanagari script
   - Then provide the same answer in Kannada (ಕನ್ನಡ) with proper Kannada script
   - Finally provide the answer in English
   - Use headers like **हिन्दी (Hindi):** / **ಕನ್ನಡ (Kannada):** / **English:**
   - Ensure all three translations convey the same information accurately
   - Act as a helpful and friendly Hindi teacher who supports multilingual learning`
      },
      english: {
        notFound: '"This chapter does not contain that information. / ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ। / इस अध्याय में वह जानकारी नहीं है।"',
        rules: `- This is an ENGLISH chapter - You MUST respond in ALL THREE LANGUAGES: English, Kannada, AND Hindi
   - Structure your response with clear sections for each language
   - First provide the answer in English
   - Then provide the same answer in Kannada (ಕನ್ನಡ) with proper Kannada script
   - Finally provide the answer in Hindi (हिन्दी) with proper Devanagari script
   - Use headers like **English:** / **ಕನ್ನಡ (Kannada):** / **हिन्दी (Hindi):**
   - Ensure all three translations convey the same information accurately
   - Maintain cultural context appropriate for Karnataka SSLC students`
      }
    };
    
    // Build system prompt with strict source-bound rules and clean markdown output
    const systemPrompt = `You are an AI tutor for Karnataka SSLC students with EXPERT knowledge of multiple languages. Follow these STRICT rules:

1. ANSWER ONLY FROM THE PROVIDED CHAPTER CONTENT - Provide DETAILED, COMPREHENSIVE explanations by default
2. If the question is NOT answerable from the chapter content, respond EXACTLY with:
   ${languageInstructions[language].notFound}
3. LANGUAGE HANDLING (CRITICAL):
   ${languageInstructions[language].rules}
   - Maintain cultural context appropriate for Karnataka SSLC students
4. RESPONSE STYLE (CRITICAL):
   - Provide DETAILED, IN-DEPTH explanations (not just point-wise answers)
   - Break down complex concepts step-by-step
   - Include examples and context where relevant
   - Explain the reasoning behind answers
   - For equations, show step-by-step derivation or solution process
5. FORMATTING (ABSOLUTE REQUIREMENTS):
   - Use clean Markdown ONLY: headings (## ###), bullet points (-), bold (**text**), italic (*text*)
   - For mathematical expressions, ALWAYS use plain text: "x^2 + 5x + 6", "Area = πr²", "E = mc²"
   - NEVER use LaTeX delimiters: NO $ or $$ symbols anywhere
   - NEVER use \\( \\) or \\[ \\] notation
   - NEVER use Unicode escape sequences like \\u0394 or \\u2220
   - USE ACTUAL SYMBOLS directly: ∠ for angle, Δ or △ for triangle/delta, θ for theta, π for pi, ° for degrees
   - For regional text, use ACTUAL characters (ಕನ್ನಡ/हिन्दी), NEVER Unicode escapes
   - Write equations naturally in the text like: "The formula is x² + 5x + 6"
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
      .replace(/\\\(([^\)]+)\\\)/g, '$1'); // Remove \(...\) inline
    
    // Convert Unicode escape sequences to actual characters
    // Matches patterns like \u0394, \u2220, \\u0C95, etc.
    aiMessage = aiMessage.replace(/\\\\u([0-9A-Fa-f]{4})/g, (_match: string, code: string) => {
      return String.fromCharCode(parseInt(code, 16));
    });
    aiMessage = aiMessage.replace(/\\u([0-9A-Fa-f]{4})/g, (_match: string, code: string) => {
      return String.fromCharCode(parseInt(code, 16));
    });
    
    // Replace common LaTeX-style commands with actual Unicode symbols
    const symbolReplacements: Record<string, string> = {
      '\\angle': '∠',
      '\\triangle': '△',
      '\\Delta': 'Δ',
      '\\theta': 'θ',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\pi': 'π',
      '\\degree': '°',
      '\\degrees': '°',
      '\\perp': '⊥',
      '\\parallel': '∥',
      '\\sqrt': '√',
      '\\rightarrow': '→',
      '\\leftarrow': '←',
      '\\leq': '≤',
      '\\geq': '≥',
      '\\neq': '≠',
      '\\approx': '≈',
      '\\infty': '∞',
      '\\sum': 'Σ',
      '\\therefore': '∴',
      '\\because': '∵',
      '\\times': '×',
      '\\div': '÷',
      '\\pm': '±',
      '\\circ': '°',
    };

    for (const [latex, symbol] of Object.entries(symbolReplacements)) {
      // Handle both single and double backslash versions
      const escapedLatex = latex.replace(/\\/g, '\\\\');
      aiMessage = aiMessage.replace(new RegExp(escapedLatex, 'g'), symbol);
      aiMessage = aiMessage.replace(new RegExp(escapedLatex.replace(/\\\\/g, '\\\\\\\\'), 'g'), symbol);
    }
    
    aiMessage = aiMessage.trim();

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
