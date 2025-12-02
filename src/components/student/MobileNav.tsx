import { useState } from "react";
import { BookOpen, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SourcesPanel } from "./SourcesPanel";
import { ToolsPanel } from "./ToolsPanel";

interface MobileNavProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
  onSelectChapter: (id: string | null) => void;
  onSelectSubject: (id: string | null) => void;
}

export const MobileNav = ({
  selectedChapterId,
  selectedSubjectId,
  onSelectChapter,
  onSelectSubject,
}: MobileNavProps) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2 px-4">
              <BookOpen className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Sources</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full p-0 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>Sources</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <SourcesPanel
                selectedChapterId={selectedChapterId}
                selectedSubjectId={selectedSubjectId}
                onSelectChapter={(id) => {
                  onSelectChapter(id);
                  setSourcesOpen(false);
                }}
                onSelectSubject={onSelectSubject}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col items-center py-2 px-4">
          <MessageSquare className="w-5 h-5 mb-1 text-primary" />
          <span className="text-[10px] text-primary font-medium">Chat</span>
        </div>

        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2 px-4">
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Tools</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full p-0 flex flex-col h-full">
            <SheetHeader className="sr-only">
              <SheetTitle>Study Tools</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ToolsPanel
                selectedChapterId={selectedChapterId}
                selectedSubjectId={selectedSubjectId}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
