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
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        <h2 className="font-medium text-xs text-foreground">Study Tools</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">Flashcards, quizzes & more</p>
      </div>

      {!selectedChapterId ? (
        <div className="p-4 text-center text-[10px] text-muted-foreground flex-1 flex items-center justify-center">
          Select a chapter to access study tools
        </div>
      ) : (
        <Tabs defaultValue="flashcards" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-10 flex-shrink-0 px-1">
            <TabsTrigger 
              value="flashcards" 
              className="rounded-none text-[10px] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary flex flex-col gap-0.5 h-full py-1"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              className="rounded-none text-[10px] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary flex flex-col gap-0.5 h-full py-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quiz</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mindmap" 
              className="rounded-none text-[10px] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary flex flex-col gap-0.5 h-full py-1"
            >
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger 
              value="videos" 
              className="rounded-none text-[10px] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary flex flex-col gap-0.5 h-full py-1"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <FlashcardsView chapterId={selectedChapterId} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="quiz" className="flex-1 m-0 overflow-hidden">
            <QuizView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="mindmap" className="flex-1 m-0 overflow-hidden">
            <MindmapView chapterId={selectedChapterId} />
          </TabsContent>

          <TabsContent value="videos" className="flex-1 m-0 overflow-hidden">
            <VideosView chapterId={selectedChapterId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
