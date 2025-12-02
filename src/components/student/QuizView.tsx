import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, RotateCcw, Loader2 } from "lucide-react";

interface QuizViewProps {
  chapterId: string;
}

export const QuizView = ({ chapterId }: QuizViewProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [chapterId]);

  const loadQuiz = async () => {
    setLoading(true);
    setSubmitted(false);
    setShowSolutions(false);
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
    } catch (error: any) {
      toast.error("Failed to submit quiz: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = quiz?.questions?.length 
    ? (Object.keys(answers).length / quiz.questions.length) * 100 
    : 0;

  if (loading && !quiz) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-3 md:p-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          No quiz available yet
        </p>
        <Button size="sm" onClick={loadQuiz} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Generate Quiz
        </Button>
      </div>
    );
  }

  // Show solutions view
  if (showSolutions && submitted && result) {
    const questions = quiz.questions || [];
    return (
      <div className="p-3 md:p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-card py-2 z-10">
          <h3 className="font-semibold text-sm">Solutions</h3>
          <Button variant="outline" size="sm" onClick={() => setShowSolutions(false)}>
            Back to Results
          </Button>
        </div>
        
        {questions.map((q: any, idx: number) => {
          const userAnswer = Object.values(answers)[idx] as number;
          const isCorrect = userAnswer === q.correctAnswer;
          
          return (
            <Card key={idx} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs font-medium bg-muted px-2 py-1 rounded">Q{idx + 1}</span>
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <p className="font-medium mb-3 text-sm leading-relaxed">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option: string, optIdx: number) => {
                    const isUserAnswer = userAnswer === optIdx;
                    const isCorrectAnswer = q.correctAnswer === optIdx;
                    
                    let className = "p-2 rounded text-sm ";
                    if (isCorrectAnswer) {
                      className += "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300";
                    } else if (isUserAnswer && !isCorrect) {
                      className += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 line-through";
                    } else {
                      className += "bg-muted/50";
                    }
                    
                    return (
                      <div key={optIdx} className={className}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                        {option}
                        {isCorrectAnswer && <span className="ml-2 text-green-600">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        <Button onClick={loadQuiz} className="w-full" variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Take New Quiz
        </Button>
      </div>
    );
  }

  // Show results view
  if (submitted && result) {
    const percentage = result.percentage;
    const scoreColor = percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600";
    const progressColor = percentage >= 70 ? "bg-green-500" : percentage >= 50 ? "bg-yellow-500" : "bg-red-500";
    
    return (
      <div className="p-3 md:p-4 space-y-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="text-center mb-4">
              <div className={`text-4xl md:text-5xl font-bold mb-2 ${scoreColor}`}>
                {percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                {result.score} out of {result.totalQuestions} correct
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Score</span>
                <span>{percentage}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${progressColor} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
              {percentage >= 70 ? (
                <p className="text-sm text-green-600 font-medium">🎉 Excellent! Great job!</p>
              ) : percentage >= 50 ? (
                <p className="text-sm text-yellow-600 font-medium">👍 Good effort! Keep practicing!</p>
              ) : (
                <p className="text-sm text-red-600 font-medium">📚 Review the chapter and try again!</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setShowSolutions(true)}>
            <Eye className="w-4 h-4 mr-2" />
            View Solutions
          </Button>
          <Button onClick={loadQuiz}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Take Again
          </Button>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Object.keys(answers).length}/{questions.length} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      <div className="text-xs text-muted-foreground">
        Question {currentQuestionIndex + 1} of {questions.length}
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <p className="font-medium mb-4 text-sm md:text-base break-words leading-relaxed">
            {currentQuestion.question}
          </p>
          <RadioGroup
            value={answers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => 
              setAnswers({ ...answers, [currentQuestionIndex]: parseInt(value) })
            }
          >
            {currentQuestion.options.map((option: string, idx: number) => (
              <div key={idx} className="flex items-start space-x-2 mb-3">
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} className="mt-1 flex-shrink-0" />
                <Label htmlFor={`option-${idx}`} className="text-sm cursor-pointer break-words leading-relaxed">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {currentQuestionIndex > 0 && (
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            className="flex-1"
          >
            Previous
          </Button>
        )}
        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            className="flex-1"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length !== questions.length}
            className="flex-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Quiz
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {questions.map((_: any, idx: number) => (
          <button
            key={idx}
            onClick={() => setCurrentQuestionIndex(idx)}
            className={`w-8 h-8 rounded text-xs transition-colors ${
              idx === currentQuestionIndex
                ? "bg-primary text-primary-foreground"
                : answers[idx] !== undefined
                  ? "bg-green-500/20 text-green-700 dark:text-green-300"
                  : "bg-muted hover:bg-muted/80"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
