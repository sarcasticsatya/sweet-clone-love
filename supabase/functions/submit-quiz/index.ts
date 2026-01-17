import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  console.log("=== SUBMIT QUIZ START ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizId, answers, startedAt } = await req.json();
    console.log("Quiz ID received:", quizId);
    console.log("Answers received:", answers);
    console.log("Answers type:", typeof answers);
    console.log("Answers length:", Array.isArray(answers) ? answers.length : "not an array");
    console.log("Started At received:", startedAt);
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

    // Get quiz with chapter info to check access
    const { data: quiz } = await supabaseClient
      .from("quizzes")
      .select("questions, chapter_id, chapters!inner(subject_id)")
      .eq("id", quizId)
      .single();

    if (!quiz) {
      return new Response(
        JSON.stringify({ error: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";

    if (!isAdmin) {
      // Check if user has access to this subject
      const subjectId = (quiz.chapters as any)?.subject_id;
      const { data: accessData } = await supabaseClient
        .from("student_subject_access")
        .select("id")
        .eq("student_id", user.id)
        .eq("subject_id", subjectId)
        .single();

      if (!accessData) {
        return new Response(
          JSON.stringify({ error: "Access denied. Please purchase this course to submit quizzes." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate score
    const questions = quiz.questions as any[];
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      }
    });

    // Save attempt with started_at timestamp
    const attemptData: any = {
      quiz_id: quizId,
      student_id: user.id,
      score,
      total_questions: questions.length,
      answers
    };
    
    // Add started_at if provided
    if (startedAt) {
      attemptData.started_at = startedAt;
    }

    const { data: attempt, error } = await supabaseClient
      .from("quiz_attempts")
      .insert(attemptData)
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
