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
    <div className="w-80 border-l border-border bg-card flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-medium text-sm text-foreground">Study Tools</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Flashcards, quizzes & videos</p>
      </div>

      {!selectedChapterId ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Select a chapter to access study tools
        </div>
      ) : (
        <Tabs defaultValue="flashcards" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-12">
            <TabsTrigger 
              value="flashcards" 
              className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Brain className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <HelpCircle className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger 
              value="mindmap" 
              className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Network className="w-4 h-4" />
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
