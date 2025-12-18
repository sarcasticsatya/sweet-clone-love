import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RotateCcw, Loader2 } from "lucide-react";

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
    setCurrentIndex(0);
    setShowAnswer(false);
    
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
      <div className="flex flex-col items-center justify-center p-6 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Generating flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-muted-foreground mb-3">
          No flashcards available yet
        </p>
        <Button size="sm" onClick={loadFlashcards} className="text-xs">
          Generate Flashcards
        </Button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Card {currentIndex + 1} of {flashcards.length}</span>
        <Button size="sm" variant="ghost" onClick={loadFlashcards} className="h-6 w-6 p-0">
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      <Card 
        className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98] min-h-[320px] flex flex-col"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <CardContent className="p-4 text-center w-full flex flex-col h-full">
          {/* Image display */}
          {currentCard.image_url && (
            <div className="mb-4 flex-shrink-0">
              <img
                src={currentCard.image_url}
                alt="Flashcard illustration"
                className="w-full max-h-40 object-contain rounded-lg border border-border bg-white"
              />
            </div>
          )}
          
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs font-medium mb-2 text-muted-foreground">
              {showAnswer ? "Answer" : "Question"}
            </p>
            <p className="text-sm leading-relaxed">
              {showAnswer ? currentCard.answer : currentCard.question}
            </p>
            {!showAnswer && (
              <p className="text-xs text-muted-foreground mt-3">
                Tap to reveal
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          disabled={flashcards.length <= 1}
          className="flex-1 h-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {/* Progress dots */}
        <div className="flex gap-1 overflow-hidden max-w-[120px]">
          {flashcards.slice(0, 8).map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                idx === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
          {flashcards.length > 8 && (
            <span className="text-[8px] text-muted-foreground">+{flashcards.length - 8}</span>
          )}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          disabled={flashcards.length <= 1}
          className="flex-1 h-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
