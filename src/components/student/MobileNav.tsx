import { useState } from "react";
import { BookOpen, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
              <BookOpen className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Sources</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full p-0">
            <SourcesPanel
              selectedChapterId={selectedChapterId}
              selectedSubjectId={selectedSubjectId}
              onSelectChapter={(id) => {
                onSelectChapter(id);
                setSourcesOpen(false);
              }}
              onSelectSubject={onSelectSubject}
            />
          </SheetContent>
        </Sheet>

        <div className="flex-col items-center">
          <MessageSquare className="w-5 h-5 mb-1 text-primary" />
          <span className="text-[10px] text-primary font-medium">Chat</span>
        </div>

        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Tools</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full p-0">
            <ToolsPanel
              selectedChapterId={selectedChapterId}
              selectedSubjectId={selectedSubjectId}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
