import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { isKannadaUIRequired, flashcardsText } from "@/lib/languageUtils";

interface FlashcardsViewProps {
  chapterId: string;
  subjectId: string | null;
}

export const FlashcardsView = ({ chapterId, subjectId }: FlashcardsViewProps) => {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [useKannadaUI, setUseKannadaUI] = useState(false);

  useEffect(() => {
    fetchSubjectInfo();
    fetchFlashcards();
  }, [chapterId, subjectId]);

  const fetchSubjectInfo = async () => {
    if (!subjectId) return;
    
    try {
      const { data: subject } = await supabase
        .from("subjects")
        .select("name, medium")
        .eq("id", subjectId)
        .single();
      
      if (subject) {
        setUseKannadaUI(isKannadaUIRequired(subject.name, subject.medium));
      }
    } catch (error) {
      console.error("Error fetching subject info:", error);
    }
  };

  const t = useKannadaUI ? flashcardsText.kn : flashcardsText.en;

  // First try to fetch from database, then generate if not found
  const fetchFlashcards = async () => {
    setInitialLoading(true);
    setCurrentIndex(0);
    setShowAnswer(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, try to fetch existing flashcards from database
      const { data: existingFlashcards, error: fetchError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: true });

      if (!fetchError && existingFlashcards && existingFlashcards.length > 0) {
        console.log(`Loaded ${existingFlashcards.length} cached flashcards`);
        setFlashcards(existingFlashcards);
        setIsCached(true);
        setInitialLoading(false);
        return;
      }

      // No cached flashcards found, generate new ones
      console.log("No cached flashcards found, generating new ones...");
      await generateFlashcards(false);
    } catch (error: any) {
      console.error("Error fetching flashcards:", error);
      toast.error("Failed to load flashcards");
    } finally {
      setInitialLoading(false);
    }
  };

  const generateFlashcards = async (regenerate: boolean = false) => {
    setLoading(true);
    setCurrentIndex(0);
    setShowAnswer(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { chapterId, regenerate },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      
      setFlashcards(data.flashcards || []);
      setIsCached(data.cached || false);
      
      if (regenerate) {
        toast.success(useKannadaUI ? "ಫ್ಲಾಶ್‌ಕಾರ್ಡ್‌ಗಳನ್ನು ಪುನಃ ರಚಿಸಲಾಗಿದೆ!" : "Flashcards regenerated successfully!");
      }
    } catch (error: any) {
      toast.error("Failed to generate flashcards: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    generateFlashcards(true);
  };

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (initialLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          {initialLoading ? t.loading : t.generating}
        </p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-muted-foreground mb-3">
          {t.noCards}
        </p>
        <Button size="sm" onClick={() => generateFlashcards(false)} className="text-xs">
          {t.generate}
        </Button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {t.cardOf(currentIndex + 1, flashcards.length)}
          {isCached && <span className="ml-1 text-green-600">{t.cached}</span>}
        </span>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleRegenerate} 
          className="h-6 px-2 gap-1"
          title={useKannadaUI ? "ಪುನಃ ರಚಿಸಿ" : "Regenerate flashcards"}
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-[10px]">{t.new}</span>
        </Button>
      </div>

      <Card 
        className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98] min-h-[280px] flex flex-col"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <CardContent className="p-4 text-center w-full flex flex-col h-full">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs font-medium mb-2 text-muted-foreground">
              {showAnswer ? t.answer : t.question}
            </p>
            <p className="text-sm leading-relaxed">
              {showAnswer ? currentCard.answer : currentCard.question}
            </p>
            {!showAnswer && (
              <p className="text-xs text-muted-foreground mt-3">
                {t.tapToReveal}
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
