import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token || "");

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin authorization check
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
      const arrayBuffer = await pdfData.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      console.log("PDF size:", typedArray.length, "bytes");

      // Use unpdf for better font/encoding handling
      console.log("Loading PDF with unpdf...");
      const pdf = await getDocumentProxy(typedArray);
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      console.log("Pages:", totalPages, "Text length:", (text as string).length);

      const extractedText = (text as string).trim();

      if (!extractedText || extractedText.length === 0) {
        console.error("No text extracted from PDF");
        return new Response(
          JSON.stringify({ 
            error: "No embedded text found in PDF. The PDF may contain only images or scanned content." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        JSON.stringify({ success: true, textLength: extractedText.length, pages: totalPages }),
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
