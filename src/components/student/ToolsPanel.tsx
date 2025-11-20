import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, HelpCircle, Video, Network } from "lucide-react";
import { FlashcardsView } from "./FlashcardsView";
import { QuizView } from "./QuizView";
import { VideosView } from "./VideosView";
import { MindmapView } from "./MindmapView";

interface ToolsPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
}

export const ToolsPanel = ({ selectedChapterId, selectedSubjectId }: ToolsPanelProps) => {
  return (
    <div className="flex flex-col h-full max-h-[40vh] md:max-h-full">
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-border flex-shrink-0">
        <h2 className="font-medium text-xs md:text-sm text-foreground">Study Tools</h2>
        <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">Flashcards, quizzes & videos</p>
      </div>

      {!selectedChapterId ? (
        <div className="p-4 md:p-6 text-center text-[10px] md:text-xs text-muted-foreground">
          Select a chapter to access study tools
        </div>
      ) : (
        <Tabs defaultValue="flashcards" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-10 md:h-12 flex-shrink-0">
            <TabsTrigger 
              value="flashcards" 
              className="rounded-none text-[10px] md:text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              className="rounded-none text-[10px] md:text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="mindmap" 
              className="rounded-none text-[10px] md:text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Network className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="videos" 
              className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Video className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards" className="flex-1 m-0">
            <FlashcardsView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="quiz" className="flex-1 m-0">
            <QuizView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="mindmap" className="flex-1 m-0">
            <MindmapView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="videos" className="flex-1 m-0">
            <VideosView subjectId={selectedSubjectId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
