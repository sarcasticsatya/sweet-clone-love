import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface FlashcardsViewProps {
  chapterId: string;
}

export const FlashcardsView = ({ chapterId }: FlashcardsViewProps) => {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, [chapterId]);

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { chapterId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setFlashcards(data.flashcards || []);
    } catch (error: any) {
      toast.error("Failed to load flashcards: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Generating flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="p-3 md:p-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          No flashcards available yet
        </p>
        <Button size="sm" onClick={loadFlashcards}>
          Generate Flashcards
        </Button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="p-3 md:p-4 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Card {currentIndex + 1} of {flashcards.length}</span>
        <Button size="sm" variant="ghost" onClick={loadFlashcards}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow min-h-[180px] md:min-h-[200px] flex items-center justify-center"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <CardContent className="p-4 md:p-6 text-center w-full">
          <p className="text-sm font-medium mb-2 text-muted-foreground">
            {showAnswer ? "Answer" : "Question"}
          </p>
          <p className="text-sm md:text-base break-words leading-relaxed">
            {showAnswer ? currentCard.answer : currentCard.question}
          </p>
          {!showAnswer && (
            <p className="text-xs text-muted-foreground mt-4">
              Tap to reveal answer
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          disabled={flashcards.length <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          disabled={flashcards.length <= 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
