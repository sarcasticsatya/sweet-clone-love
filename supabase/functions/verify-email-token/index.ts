import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyTokenRequest {
  token: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: VerifyTokenRequest = await req.json();
    
    console.log(`Verifying token: ${token?.substring(0, 8)}...`);

    if (!token) {
      throw new Error("Token is required");
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found:", tokenError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired verification link" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.error("Token expired");
      return new Response(
        JSON.stringify({ success: false, error: "Verification link has expired. Please request a new one." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if already used
    if (tokenData.used_at) {
      console.log("Token already used, but verification is valid");
      return new Response(
        JSON.stringify({ success: true, message: "Email already verified", email: tokenData.email }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Update student_profiles to mark email as verified
    const { error: updateError } = await supabaseAdmin
      .from("student_profiles")
      .update({ email_verified: true })
      .eq("user_id", tokenData.user_id);

    if (updateError) {
      console.error("Error updating student profile:", updateError);
      throw new Error("Failed to update verification status");
    }

    console.log(`Email verified successfully for user ${tokenData.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        email: tokenData.email 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-email-token:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
