import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

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
    const authHeader = req.headers.get("authorization");

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

    // Authentication check
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token || "");

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin authorization check - only admins can extract PDF text
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    
    try {
      // Use pdfjs-serverless to extract text
      const arrayBuffer = await pdfData.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      console.log("PDF size:", typedArray.length, "bytes");

      console.log("Loading PDF with pdfjs-serverless...");
      const doc = await getDocument(typedArray).promise;
      const numPages = doc.numPages;
      console.log("Number of pages:", numPages);

      // Extract text from all pages
      let extractedText = "";
      for (let i = 1; i <= numPages; i++) {
        console.log(`Extracting text from page ${i}/${numPages}...`);
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .filter((item: any) => item.str != null)
          .map((item: any) => item.str as string)
          .join(" ")
          .replace(/\s+/g, " ");
        
        extractedText += pageText + "\n\n";
      }

      extractedText = extractedText.trim();

      if (!extractedText || extractedText.length === 0) {
        console.error("No text extracted from PDF - may be scanned/image-based");
        return new Response(
          JSON.stringify({ 
            error: "No embedded text found in PDF. The PDF may contain only images or scanned content. Please contact admin to enable OCR support." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({ 
          success: true, 
          textLength: extractedText.length,
          pages: numPages 
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
