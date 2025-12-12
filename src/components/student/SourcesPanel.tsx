import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourcesPanelProps {
  selectedChapterId: string | null;
  selectedSubjectId: string | null;
  onSelectChapter: (chapterId: string | null) => void;
  onSelectSubject: (subjectId: string | null) => void;
}

export const SourcesPanel = ({ 
  selectedChapterId, 
  selectedSubjectId,
  onSelectChapter,
  onSelectSubject 
}: SourcesPanelProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Record<string, any[]>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get subjects accessible to this student
    const { data: accessData } = await supabase
      .from("student_subject_access")
      .select("subject_id")
      .eq("student_id", session.user.id);

    if (!accessData?.length) {
      // No access - show empty (parent component handles the waiting state)
      setSubjects([]);
      return;
    }

    const subjectIds = accessData.map(a => a.subject_id);
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("*")
      .in("id", subjectIds)
      .order("name");

    setSubjects(subjectsData || []);
  };

  const loadChapters = async (subjectId: string) => {
    if (chapters[subjectId]) return; // Already loaded

    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("chapter_number");

    setChapters(prev => ({ ...prev, [subjectId]: data || [] }));
  };

  const toggleSubject = async (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
      await loadChapters(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleSelectChapter = (chapterId: string, subjectId: string) => {
    onSelectChapter(chapterId);
    onSelectSubject(subjectId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-border flex-shrink-0">
        <h2 className="font-medium text-xs md:text-sm text-foreground">Sources</h2>
        <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">Select a chapter to begin</p>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 md:p-3">
          {subjects.length === 0 ? (
            <div className="p-3 md:p-4 text-center text-[10px] md:text-xs text-muted-foreground">
              No subjects assigned yet
            </div>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="mb-1 md:mb-1.5">
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-2 md:py-2.5 rounded-md hover:bg-accent/50 transition-colors text-left group"
                >
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 md:w-3.5 md:h-3.5 transition-transform text-muted-foreground group-hover:text-foreground flex-shrink-0",
                      expandedSubjects.has(subject.id) && "rotate-90"
                    )}
                  />
                  <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-[13px] font-medium flex-1 truncate">
                    {subject.name_kannada || subject.name}
                  </span>
                </button>

                {expandedSubjects.has(subject.id) && (
                  <div className="ml-4 md:ml-5 mt-1 space-y-0.5">
                    {chapters[subject.id]?.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => handleSelectChapter(chapter.id, subject.id)}
                        className={cn(
                          "w-full text-left px-2.5 md:px-3 py-1.5 md:py-2 rounded text-[11px] md:text-[12px] transition-all",
                          selectedChapterId === chapter.id
                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                            : "hover:bg-accent/50 text-foreground border-l-2 border-transparent"
                        )}
                      >
                        <div className="line-clamp-2 break-words">
                          {chapter.chapter_number}. {chapter.name_kannada || chapter.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
