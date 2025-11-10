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
    const { chapterId } = await req.json();

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: "Chapter ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get chapter details
    const { data: chapter, error: chapterError } = await supabaseClient
      .from("chapters")
      .select("pdf_storage_path")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapter) {
      return new Response(
        JSON.stringify({ error: "Chapter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from("chapter-pdfs")
      .download(chapter.pdf_storage_path);

    if (downloadError || !pdfData) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting PDF text extraction for chapter:", chapterId);
    
    // Generate signed URL for the PDF (avoid base64 to reduce failures and memory)
    const { data: signed, error: signedErr } = await supabaseClient
      .storage
      .from("chapter-pdfs")
      .createSignedUrl(chapter.pdf_storage_path, 600);

    if (signedErr || !signed?.signedUrl) {
      console.error("Failed to create signed URL:", signedErr);
      return new Response(
        JSON.stringify({ error: "Failed to access PDF for extraction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileUrl = signed.signedUrl;
    console.log("Signed URL generated for PDF");

    // Use Lovable AI with Gemini Pro for better document understanding
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending PDF to Gemini for text extraction...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ONLY textual content from this PDF. Ignore images, diagrams, and formulas. Preserve Kannada and English text exactly as written. Output ONLY the extracted text with no additional commentary. Maintain original paragraph breaks."
              },
              {
                type: "image_url",
                image_url: {
                  url: fileUrl
                }
              }
            ]
          }
        ],
        max_tokens: 16000
      }),
    });

    console.log("AI Response status:", aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI extraction error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to extract text from PDF", 
          details: `Status: ${aiResponse.status}`,
          message: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI Response received, extracting content...");
    
    const extractedText = aiData.choices?.[0]?.message?.content || "";
    
    if (!extractedText) {
      console.error("No text extracted from PDF");
      return new Response(
        JSON.stringify({ error: "No text could be extracted from PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Extracted text length:", extractedText.length);

    // Update chapter with extracted text
    const { error: updateError } = await supabaseClient
      .from("chapters")
      .update({ content_extracted: extractedText })
      .eq("id", chapterId);

    if (updateError) {
      console.error("Error updating chapter:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save extracted text" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, textLength: extractedText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-pdf-text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
