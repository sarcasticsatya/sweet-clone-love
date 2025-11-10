import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PDFParser from "https://esm.sh/pdf-parse@1.1.1";

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
    
    // Use pdf-parse library to extract text directly from PDF
    const arrayBuffer = await pdfData.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);
    console.log("PDF size:", pdfBuffer.length, "bytes");

    try {
      console.log("Extracting text using pdf-parse library...");
      const pdfData_parsed = await PDFParser(pdfBuffer);
      const extractedText = pdfData_parsed.text;

      if (!extractedText || extractedText.trim().length === 0) {
        console.error("No text extracted from PDF - may be scanned/image-based");
        return new Response(
          JSON.stringify({ 
            error: "No text found in PDF. The PDF may contain only images or scanned content. OCR support coming soon." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Extracted text length:", extractedText.length);
      console.log("Number of pages:", pdfData_parsed.numpages);

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
        JSON.stringify({ 
          success: true, 
          textLength: extractedText.length,
          pages: pdfData_parsed.numpages 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse PDF",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in extract-pdf-text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
