import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, HelpCircle, Video } from "lucide-react";
import { FlashcardsView } from "./FlashcardsView";
import { QuizView } from "./QuizView";
import { VideosView } from "./VideosView";

interface ToolsPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
}

export const ToolsPanel = ({ selectedChapterId, selectedSubjectId }: ToolsPanelProps) => {
  return (
    <div className="w-80 border-l border-border bg-muted/30 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Tools</h2>
        <p className="text-xs text-muted-foreground mt-1">Study aids and resources</p>
      </div>

      {!selectedChapterId ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Select a chapter to access tools
        </div>
      ) : (
        <Tabs defaultValue="flashcards" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
            <TabsTrigger value="flashcards" className="rounded-none">
              <Brain className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="quiz" className="rounded-none">
              <HelpCircle className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="videos" className="rounded-none">
              <Video className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards" className="flex-1 m-0">
            <FlashcardsView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="quiz" className="flex-1 m-0">
            <QuizView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="videos" className="flex-1 m-0">
            <VideosView subjectId={selectedSubjectId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
