import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

interface QuizViewProps {
  chapterId: string;
}

export const QuizView = ({ chapterId }: QuizViewProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [chapterId]);

  const loadQuiz = async () => {
    setLoading(true);
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
      setAnswers({});
      setSubmitted(false);
      setCurrentQuestionIndex(0);
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

  if (loading && !quiz) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          No quiz available yet
        </p>
        <Button size="sm" onClick={loadQuiz}>
          Generate Quiz
        </Button>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold mb-2">{result.percentage}%</div>
            <div className="text-sm text-muted-foreground">
              {result.score} out of {result.totalQuestions} correct
            </div>
          </CardContent>
        </Card>
        <Button onClick={loadQuiz} className="w-full">
          Take Again
        </Button>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-muted-foreground">
        Question {currentQuestionIndex + 1} of {questions.length}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="font-medium mb-4 text-sm">{currentQuestion.question}</p>
          <RadioGroup
            value={answers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => 
              setAnswers({ ...answers, [currentQuestionIndex]: parseInt(value) })
            }
          >
            {currentQuestion.options.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="text-sm cursor-pointer">
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
            Submit Quiz
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {questions.map((_: any, idx: number) => (
          <button
            key={idx}
            onClick={() => setCurrentQuestionIndex(idx)}
            className={`w-8 h-8 rounded text-xs ${
              idx === currentQuestionIndex
                ? "bg-primary text-primary-foreground"
                : answers[idx] !== undefined
                  ? "bg-primary/20 text-primary"
                  : "bg-muted"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
};
