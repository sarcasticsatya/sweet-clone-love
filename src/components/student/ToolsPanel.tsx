import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, HelpCircle, Video } from "lucide-react";

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

      <ScrollArea className="flex-1">
        {!selectedChapterId ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Select a chapter to access tools
          </div>
        ) : (
          <Tabs defaultValue="flashcards" className="w-full">
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

            <TabsContent value="flashcards" className="p-4 space-y-3">
              <h3 className="font-medium text-sm mb-3">Flashcards</h3>
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Generate flashcards from this chapter (Coming soon)
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz" className="p-4 space-y-3">
              <h3 className="font-medium text-sm mb-3">Quiz</h3>
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Take a quiz on this chapter (Coming soon)
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="p-4 space-y-3">
              <h3 className="font-medium text-sm mb-3">Videos</h3>
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  {selectedSubjectId ? "Subject videos will appear here" : "Video library coming soon"}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </ScrollArea>
    </div>
  );
};
