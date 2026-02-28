import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Determine response language(s) based on subject name and medium
function getResponseLanguages(subjectName: string, medium: string): "kannada_only" | "english_only" | "english_kannada" | "hindi_kannada" {
  const normalizedSubject = subjectName.toLowerCase();
  
  if (medium === "English") {
    // English Medium Rules
    if (normalizedSubject.includes("kannada") || normalizedSubject.includes("ಕನ್ನಡ")) return "kannada_only";
    if (normalizedSubject.includes("hindi") || normalizedSubject.includes("ಹಿಂದಿ")) return "hindi_kannada";
    if (normalizedSubject.includes("maths") || normalizedSubject.includes("math") || normalizedSubject.includes("mathematics")) return "english_only";
    // English, Social, Science - English + Kannada
    return "english_kannada";
  } else {
    // Kannada Medium Rules - use original subject name to preserve Kannada script
    const subject = subjectName.trim();
    
    // English subject in Kannada medium (ಇಂಗ್ಲೀಷ) - bilingual English + Kannada
    if (subject === "ಇಂಗ್ಲೀಷ" || subject.includes("ಇಂಗ್ಲೀಷ") || normalizedSubject.includes("english")) {
      return "english_kannada";
    }
    
    // Hindi subject in Kannada medium (ಹಿಂದಿ) - bilingual Hindi + Kannada
    if (subject === "ಹಿಂದಿ" || subject.includes("ಹಿಂದಿ") || normalizedSubject.includes("hindi")) {
      return "hindi_kannada";
    }
    
    // All other Kannada medium subjects (ಕನ್ನಡ, ಗಣಿತ, ವಿಜ್ಞಾನ, ಸಮಾಜ ವಿಜ್ಞಾನ) - Kannada only
    return "kannada_only";
  }
}

// Helper function to check subject access
async function checkSubjectAccess(supabaseClient: any, userId: string, chapterId: string): Promise<{ hasAccess: boolean; isAdmin: boolean; chapter: any }> {
  // Get chapter with subject_id and medium
  const { data: chapter, error: chapterError } = await supabaseClient
    .from("chapters")
    .select("subject_id, content_extracted, name, name_kannada, subjects!inner(name, name_kannada, medium)")
    .eq("id", chapterId)
    .single();

  if (chapterError || !chapter) {
    return { hasAccess: false, isAdmin: false, chapter: null };
  }

  // Check if user is admin
  const { data: roleData } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleData?.role === "admin") {
    return { hasAccess: true, isAdmin: true, chapter };
  }

  // Check if user has access to this subject
  const { data: accessData } = await supabaseClient
    .from("student_subject_access")
    .select("id")
    .eq("student_id", userId)
    .eq("subject_id", chapter.subject_id)
    .single();

  return { hasAccess: !!accessData, isAdmin: false, chapter };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, message, conversationHistory } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!chapterId || !message) {
      return new Response(JSON.stringify({ error: "Chapter ID and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string };

    // Check subject access
    const { hasAccess, chapter } = await checkSubjectAccess(supabaseClient, user.id, chapterId);

    if (!chapter) {
      return new Response(JSON.stringify({ error: "Chapter not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied. Please purchase this course to access chat." }), {
        status: 403,
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

    // Get videos with timestamps for this chapter (also fetch description to parse timestamps)
    const { data: videos } = await supabaseClient
      .from("videos")
      .select("id, title, title_kannada, timestamps, description")
      .eq("chapter_id", chapterId);

    // Helper function to parse timestamps from video description
    function parseTimestampsFromDescription(description: string | null): Array<{ time: string; label: string }> {
      if (!description) return [];
      
      const timestamps: Array<{ time: string; label: string }> = [];
      
      // Pattern for START_TIME-END_TIME LABEL format (e.g., "00:00:01-00:00:12  ಪರಿಚಯ")
      const rangeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)/g;
      let match;
      
      while ((match = rangeRegex.exec(description)) !== null) {
        // Use start time (match[1]) and label (match[3])
        timestamps.push({ time: match[1], label: match[3].trim() });
      }
      
      // If range pattern found timestamps, return them
      if (timestamps.length > 0) {
        console.log("Parsed timestamps (range format):", JSON.stringify(timestamps));
        return timestamps;
      }
      
      // Fallback: Standard TIME - LABEL format (e.g., "0:30 - Introduction")
      // Make sure label doesn't start with a digit (to avoid matching end times)
      const simpleRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*([^\d\n].+?)(?=\n|$)/g;
      while ((match = simpleRegex.exec(description)) !== null) {
        timestamps.push({ time: match[1], label: match[2].trim() });
      }
      
      console.log("Parsed timestamps (simple format):", JSON.stringify(timestamps));
      return timestamps;
    }

    // Build video reference context - ONLY include videos with actual timestamps
    let videoContext = "";
    if (videos && videos.length > 0) {
      const videosWithTimestamps = videos.map(video => {
        // Check timestamps column first, then parse from description
        let parsedTimestamps = video.timestamps;
        if (!parsedTimestamps || (Array.isArray(parsedTimestamps) && parsedTimestamps.length === 0)) {
          parsedTimestamps = parseTimestampsFromDescription(video.description);
        }
        return { ...video, timestamps: parsedTimestamps };
      }).filter(video => 
        video.timestamps && 
        Array.isArray(video.timestamps) && 
        (video.timestamps as Array<{ time: string; label: string }>).length > 0
      );
      
      if (videosWithTimestamps.length > 0) {
        videoContext = "\n\n7. VIDEO REFERENCES (STRICT RULES):";
        videoContext += "\n   - ONLY reference videos if their timestamp labels EXACTLY match or are DIRECTLY relevant to the question topic";
        videoContext += "\n   - If no video timestamps match the topic, DO NOT mention any videos";
        videoContext += "\n   - NEVER make up or guess timestamps - only use timestamps provided in the video list below";
        videoContext += "\n   - Format: 📹 Watch: [Video Title] at [timestamp] for visual explanation";
        videoContext += "\n\n=== RELATED VIDEOS WITH TIMESTAMPS (YOU CAN USE THIS DATA TO ANSWER) ===\n";
        videosWithTimestamps.forEach(video => {
          const videoTitle = video.title_kannada || video.title;
          const timestamps = video.timestamps as Array<{ time: string; label: string }>;
          videoContext += `\nVIDEO: ${videoTitle}\n`;
          videoContext += `TOPICS COVERED:\n`;
          timestamps.forEach(t => {
            videoContext += `  - ${t.time}: ${t.label}\n`;
          });
        });
        videoContext += "\n=== VIDEO INSTRUCTIONS ===";
        videoContext += "\n- When user asks about videos, video content, video summary, or timestamps - USE THIS DATA to answer";
        videoContext += "\n- You CAN and SHOULD provide a summary of video topics using these timestamps when asked";
        videoContext += "\n- When referencing specific topics, use format: 📹 Watch: [Video Title] at [timestamp]";
        videoContext += "\n- The video timestamps above ARE part of the chapter's learning resources - they are NOT external";
      }
    }

    const chapterName = chapter.name_kannada || chapter.name;
    const subjectName = (chapter.subjects as any)?.name || (chapter.subjects as any)?.name_kannada || "";
    const subjectMedium = (chapter.subjects as any)?.medium || "English";

    // Get response language based on subject and medium
    const responseLanguage = getResponseLanguages(subjectName, subjectMedium);
    console.log("SUBJECT:", subjectName, "MEDIUM:", subjectMedium, "RESPONSE_LANGUAGE:", responseLanguage);

    // Build language-specific instructions based on the matrix
    const languageInstructions = {
      kannada_only: {
        notFound: '"ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ."',
        rules: `- Respond ONLY in Kannada (ಕನ್ನಡ)
   - Use proper Kannada script (ಕನ್ನಡ ಲಿಪಿ) with correct grammar
   - DO NOT include English or Hindi translations
   - This is a Kannada-only subject - ALL responses must be in Kannada`
      },
      english_only: {
        notFound: '"This chapter does not contain that information."',
        rules: `- Respond ONLY in English
   - DO NOT include Kannada or Hindi translations
   - Use clear, simple English appropriate for SSLC students
   - This is a Mathematics subject - English only responses`
      },
      english_kannada: {
        notFound: '"This chapter does not contain that information. / ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ."',
        rules: `- Respond in TWO languages: English AND Kannada
   - First provide the answer in English
   - Then provide the same answer in Kannada (ಕನ್ನಡ)
   - Use headers like **English:** / **ಕನ್ನಡ (Kannada):**
   - DO NOT include Hindi
   - Ensure both translations convey the same information accurately`
      },
      hindi_kannada: {
        notFound: '"इस अध्याय में वह जानकारी नहीं है। / ಈ ಅಧ್ಯಾಯವು ಆ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ."',
        rules: `- Respond in TWO languages: Hindi AND Kannada
   - First provide the answer in Hindi (हिन्दी) with proper Devanagari script
   - Then provide the same answer in Kannada (ಕನ್ನಡ)
   - Use headers like **हिन्दी (Hindi):** / **ಕನ್ನಡ (Kannada):**
   - DO NOT include English
   - This is a Hindi language subject`
      }
    };
    
    // Build system prompt with strict source-bound rules and clean markdown output
    const systemPrompt = `You are an AI tutor for Karnataka SSLC students with EXPERT knowledge of multiple languages. Follow these STRICT rules:

1. ANSWER FROM TWO SOURCES: (A) Chapter Content AND (B) Video Timestamps listed below
   - Provide DETAILED, COMPREHENSIVE explanations by default
   - For questions about videos, summaries, or timestamps - USE THE VIDEO TIMESTAMPS DATA below
2. If the question is NOT answerable from EITHER the chapter content OR the video timestamps, respond EXACTLY with:
   ${languageInstructions[responseLanguage].notFound}
3. LANGUAGE HANDLING (CRITICAL):
   ${languageInstructions[responseLanguage].rules}
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
