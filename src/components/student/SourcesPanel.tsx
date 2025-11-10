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
      // If no access records, show all subjects (for demo)
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      
      setSubjects(subjectsData || []);
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
    <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Sources</h2>
        <p className="text-xs text-muted-foreground mt-1">Select a chapter to begin</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {subjects.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No subjects assigned yet
            </div>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="mb-2">
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expandedSubjects.has(subject.id) && "rotate-90"
                    )}
                  />
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium flex-1">
                    {subject.name_kannada || subject.name}
                  </span>
                </button>

                {expandedSubjects.has(subject.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {chapters[subject.id]?.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => handleSelectChapter(chapter.id, subject.id)}
                        className={cn(
                          "w-full text-left p-2 px-3 rounded-md text-sm transition-colors",
                          selectedChapterId === chapter.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        {chapter.chapter_number}. {chapter.name_kannada || chapter.name}
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
