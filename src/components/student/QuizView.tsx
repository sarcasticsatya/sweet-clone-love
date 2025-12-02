import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, RotateCcw, Loader2, History, Trophy } from "lucide-react";

interface QuizViewProps {
  chapterId: string;
}

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  attempted_at: string;
}

export const QuizView = ({ chapterId }: QuizViewProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    loadPastAttempts();
  }, [chapterId]);

  const loadPastAttempts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get quiz for this chapter
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id")
        .eq("chapter_id", chapterId)
        .single();

      if (quizData) {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id, score, total_questions, attempted_at")
          .eq("quiz_id", quizData.id)
          .eq("student_id", session.user.id)
          .order("attempted_at", { ascending: false })
          .limit(10);

        setPastAttempts(attempts || []);
      }
    } catch (error) {
      console.error("Error loading past attempts:", error);
    }
  };

  const loadQuiz = async () => {
    setLoading(true);
    setSubmitted(false);
    setShowSolutions(false);
    setShowHistory(false);
    setResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { chapterId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      setQuiz(data.quiz);
    } catch (error: any) {
      toast.error("Failed to load quiz: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      toast.error("Please answer all questions");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("submit-quiz", {
        body: {
          quizId: quiz.id,
          answers: Object.values(answers)
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setResult(data);
      setSubmitted(true);
      toast.success(`Quiz completed! Score: ${data.percentage}%`);
      loadPastAttempts(); // Refresh history
    } catch (error: any) {
      toast.error("Failed to submit quiz: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = quiz?.questions?.length 
    ? (Object.keys(answers).length / quiz.questions.length) * 100 
    : 0;

  // Loading state
  if (loading && !quiz) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Generating quiz...</p>
      </div>
    );
  }

  // Initial state - no quiz loaded
  if (!quiz) {
    const bestScore = pastAttempts.length > 0 
      ? Math.max(...pastAttempts.map(a => Math.round((a.score / a.total_questions) * 100)))
      : null;

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          {/* Best score badge */}
          {bestScore !== null && (
            <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Best Score: {bestScore}%</span>
            </div>
          )}

          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Test your knowledge with a quiz
            </p>
            <Button size="sm" onClick={loadQuiz} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Start New Quiz
            </Button>
          </div>

          {/* Past attempts */}
          {pastAttempts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <History className="w-3 h-3" />
                Recent Attempts
              </div>
              <div className="space-y-2">
                {pastAttempts.slice(0, 5).map((attempt) => {
                  const pct = Math.round((attempt.score / attempt.total_questions) * 100);
                  return (
                    <div key={attempt.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-xs">
                      <span className="text-muted-foreground">
                        {new Date(attempt.attempted_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{attempt.score}/{attempt.total_questions}</span>
                        <span className={`font-medium px-2 py-0.5 rounded ${
                          pct >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          pct >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // Solutions view
  if (showSolutions && submitted && result) {
    const questions = quiz.questions || [];
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between sticky top-0 bg-card py-2 z-10">
            <h3 className="font-semibold text-xs">Solutions</h3>
            <Button variant="outline" size="sm" onClick={() => setShowSolutions(false)} className="h-7 text-xs">
              Back
            </Button>
          </div>
          
          {questions.map((q: any, idx: number) => {
            const userAnswer = Object.values(answers)[idx] as number;
            const isCorrect = userAnswer === q.correctAnswer;
            
            return (
              <Card key={idx} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">Q{idx + 1}</span>
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="font-medium mb-2 text-xs leading-relaxed">{q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((option: string, optIdx: number) => {
                      const isUserAnswer = userAnswer === optIdx;
                      const isCorrectAnswer = q.correctAnswer === optIdx;
                      
                      let className = "p-2 rounded text-xs ";
                      if (isCorrectAnswer) {
                        className += "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
                      } else if (isUserAnswer) {
                        className += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through";
                      } else {
                        className += "bg-muted/30";
                      }
                      
                      return (
                        <div key={optIdx} className={className}>
                          {String.fromCharCode(65 + optIdx)}. {option}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <Button onClick={loadQuiz} className="w-full" size="sm">
            <RotateCcw className="w-3 h-3 mr-2" />
            Take New Quiz
          </Button>
        </div>
      </ScrollArea>
    );
  }

  // Results view
  if (submitted && result) {
    const percentage = result.percentage;
    const scoreColor = percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600";
    const progressColor = percentage >= 70 ? "bg-green-500" : percentage >= 50 ? "bg-yellow-500" : "bg-red-500";
    
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <div className={`text-4xl font-bold mb-1 ${scoreColor}`}>
                  {percentage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.score} of {result.totalQuestions} correct
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Score</span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${progressColor} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              
              <div className="mt-3 p-2 rounded bg-muted/50 text-center">
                {percentage >= 70 ? (
                  <p className="text-xs text-green-600 font-medium">🎉 Excellent!</p>
                ) : percentage >= 50 ? (
                  <p className="text-xs text-yellow-600 font-medium">👍 Good effort!</p>
                ) : (
                  <p className="text-xs text-red-600 font-medium">📚 Keep practicing!</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSolutions(true)} className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Solutions
            </Button>
            <Button size="sm" onClick={loadQuiz} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              New Quiz
            </Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Quiz in progress
  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>{Object.keys(answers).length}/{questions.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        
        <div className="text-[10px] text-muted-foreground">
          Q{currentQuestionIndex + 1} of {questions.length}
        </div>

        <Card>
          <CardContent className="p-3">
            <p className="font-medium mb-3 text-xs leading-relaxed">
              {currentQuestion.question}
            </p>
            <RadioGroup
              value={answers[currentQuestionIndex]?.toString()}
              onValueChange={(value) => 
                setAnswers({ ...answers, [currentQuestionIndex]: parseInt(value) })
              }
            >
              {currentQuestion.options.map((option: string, idx: number) => (
                <div key={idx} className="flex items-start space-x-2 mb-2">
                  <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="mt-0.5 flex-shrink-0" />
                  <Label htmlFor={`opt-${idx}`} className="text-xs cursor-pointer leading-relaxed">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              className="flex-1 text-xs"
            >
              Previous
            </Button>
          )}
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              className="flex-1 text-xs"
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || Object.keys(answers).length !== questions.length}
              className="flex-1 text-xs"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Submit
            </Button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap gap-1 justify-center">
          {questions.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-6 h-6 rounded text-[10px] transition-colors ${
                idx === currentQuestionIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[idx] !== undefined
                    ? "bg-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-muted"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
