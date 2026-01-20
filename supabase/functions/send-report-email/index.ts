import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
            <p style="font-size: 16px; color: #333;">Dear <strong>${studentName}</strong>,</p>
            
            <p style="color: #555; line-height: 1.6;">
              Your quiz performance report is ready! Please find the detailed report attached to this email.
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Quiz Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Subject</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${subject || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Chapter</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${chapter || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Score</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${score || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #e2e8f0;">Percentage</td>
                  <td style="padding: 8px 0; color: ${parseInt(percentage || "0") >= 70 ? "#22c55e" : parseInt(percentage || "0") >= 50 ? "#eab308" : "#ef4444"}; font-weight: bold; text-align: right; border-bottom: 1px solid #e2e8f0;">${percentage || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Date</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold; text-align: right;">${date || "N/A"}</td>
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
            <p style="font-size: 16px; color: #333;">Dear <strong>${studentName}</strong>,</p>
            
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

    // Generate filename
    const fileName = reportType === "individual"
      ? `Quiz_Report_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
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
