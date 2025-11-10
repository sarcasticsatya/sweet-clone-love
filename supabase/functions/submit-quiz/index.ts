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
    const { quizId, answers } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!quizId || !answers) {
      return new Response(
        JSON.stringify({ error: "Quiz ID and answers are required" }),
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

    // Get quiz
    const { data: quiz } = await supabaseClient
      .from("quizzes")
      .select("questions")
      .eq("id", quizId)
      .single();

    if (!quiz) {
      return new Response(
        JSON.stringify({ error: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate score
    const questions = quiz.questions as any[];
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      }
    });

    // Save attempt
    const { data: attempt, error } = await supabaseClient
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        score,
        total_questions: questions.length,
        answers
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving quiz attempt:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save quiz attempt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        score, 
        totalQuestions: questions.length,
        percentage: Math.round((score / questions.length) * 100),
        attempt
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in submit-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
