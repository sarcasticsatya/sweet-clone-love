import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  firstName: string;
  type: "signup" | "resend";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, type }: VerificationEmailRequest = await req.json();
    
    console.log(`Sending verification email to ${email} (type: ${type})`);

    if (!email) {
      throw new Error("Email is required");
    }

    // Create Supabase admin client to generate verification link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate magic link for email verification
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://lnoeofoucvyopmhcfwes.lovableproject.com"}/auth`,
      },
    });

    if (linkError) {
      console.error("Error generating verification link:", linkError);
      throw new Error(`Failed to generate verification link: ${linkError.message}`);
    }

    const verificationLink = linkData.properties?.action_link;
    
    if (!verificationLink) {
      throw new Error("No verification link generated");
    }

    console.log("Verification link generated successfully");

    // Send branded verification email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nythic AI <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your Nythic AI account",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 32px; text-align: center;">
                        <!-- Logo/Header -->
                        <div style="margin-bottom: 32px;">
                          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">
                            🎓 Nythic AI
                          </h1>
                          <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">
                            Your Learning Companion
                          </p>
                        </div>
                        
                        <!-- Welcome Message -->
                        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                          Welcome${firstName ? `, ${firstName}` : ""}! 👋
                        </h2>
                        
                        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                          Thank you for signing up for Nythic AI. Please verify your email address to complete your registration and start learning.
                        </p>
                        
                        <!-- CTA Button -->
                        <a href="${verificationLink}" 
                           style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; margin-bottom: 24px;">
                          Verify Email Address
                        </a>
                        
                        <p style="margin: 24px 0 0; font-size: 13px; color: #71717a;">
                          If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa; word-break: break-all;">
                          ${verificationLink}
                        </p>
                        
                        <!-- Footer -->
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">
                        
                        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                          If you didn't create an account with Nythic AI, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    const resendData = await resendResponse.json();
    
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
