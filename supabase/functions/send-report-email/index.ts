import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  pdfBase64: string;
  recipientEmail: string;
  studentName: string;
  reportType: "individual" | "global";
  subject?: string;
  chapter?: string;
  score?: string;
  percentage?: string;
  date?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const {
      pdfBase64,
      recipientEmail,
      studentName,
      reportType,
      subject,
      chapter,
      score,
      percentage,
      date,
    }: ReportEmailRequest = await req.json();

    console.log(`Sending ${reportType} report email to ${recipientEmail}`);

    // Validate required fields
    if (!pdfBase64 || !recipientEmail || !studentName) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate PDF size (max 10MB base64 = ~7.5MB file)
    if (pdfBase64.length > 10 * 1024 * 1024) {
      console.error("PDF too large");
      return new Response(
        JSON.stringify({ error: "PDF file too large" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role for authorization checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authorization check based on report type
    if (reportType === "global") {
      // Global reports require admin role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        console.error("Admin access required for global reports");
        return new Response(
          JSON.stringify({ error: "Admin access required for global reports" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Admin authorization verified for global report");
    } else {
      // Individual reports: verify email ownership
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("student_profiles")
        .select("personal_email, parent_email")
        .eq("user_id", user.id)
        .single();

      // Get allowed emails (user auth email + profile emails)
      const allowedEmails = [
        user.email,
        profile?.personal_email,
        profile?.parent_email
      ].filter(Boolean).map(e => e?.toLowerCase());

      if (!allowedEmails.includes(recipientEmail.toLowerCase())) {
        console.error(`Email ${recipientEmail} not authorized for user ${user.id}`);
        return new Response(
          JSON.stringify({ error: "Can only send reports to your registered email addresses" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Email ownership verified for individual report");
    }

    // Generate email content based on report type
    const emailSubject = reportType === "individual"
      ? `Quiz Performance Report - ${subject || "Quiz"}`
      : "Competitive Analysis Report - NythicAI Edtech";

    const emailHtml = reportType === "individual"
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Quiz Performance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">NythicAI Edtech</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${escapeHtml(studentName)}</strong>,</p>
            
            <p style="color: #555; line-height: 1.6;">
              Your quiz performance report is ready! Please find the detailed report attached to this email.
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Quiz Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Subject</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(subject || "N/A")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Chapter</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(chapter || "N/A")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Score</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(score || "N/A")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Percentage</td>
                  <td style="padding: 8px 0; color: ${parseInt(percentage || "0") >= 70 ? "#22c55e" : parseInt(percentage || "0") >= 50 ? "#eab308" : "#ef4444"}; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${escapeHtml(percentage || "N/A")}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">${escapeHtml(date || "N/A")}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #555; line-height: 1.6;">
              Keep up the great work and continue striving for excellence!
            </p>
            
            <p style="color: #555; margin-top: 30px;">
              Best regards,<br>
              <strong>NythicAI Edtech Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>This is an automated email from NythicAI Edtech.</p>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Competitive Analysis Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">NythicAI Edtech</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${escapeHtml(studentName)}</strong>,</p>
            
            <p style="color: #555; line-height: 1.6;">
              Please find attached the comprehensive competitive analysis report containing performance summaries, leaderboards, and detailed quiz history.
            </p>
            
            <p style="color: #555; line-height: 1.6;">
              This report provides valuable insights into overall student performance and helps identify areas for improvement.
            </p>
            
            <p style="color: #555; margin-top: 30px;">
              Best regards,<br>
              <strong>NythicAI Edtech Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>This is an automated email from NythicAI Edtech.</p>
          </div>
        </body>
        </html>
      `;

    // Generate filename with sanitized student name
    const sanitizedName = studentName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
    const fileName = reportType === "individual"
      ? `Quiz_Report_${sanitizedName}_${new Date().toISOString().split("T")[0]}.pdf`
      : `Global_Report_${new Date().toISOString().split("T")[0]}.pdf`;

    // Send email with PDF attachment via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NythicAI <noreply@nythicai.com>",
        to: [recipientEmail],
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending report email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

// Helper function to escape HTML in user-provided content
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
