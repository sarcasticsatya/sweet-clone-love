import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, BookOpen } from "lucide-react";
import { SourcesPanel } from "@/components/student/SourcesPanel";
import { ChatPanel } from "@/components/student/ChatPanel";
import { ToolsPanel } from "@/components/student/ToolsPanel";
import { MobileNav } from "@/components/student/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
const StudentDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).single();
    if (roleData?.role !== "student") {
      toast.error("Access denied. Students only.");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  if (!user) return null;
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* NotebookLM-style Header */}
      <header className="border-b border-border px-3 md:px-4 py-2.5 flex items-center justify-between bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-7 md:h-7 bg-primary rounded flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-medium">Nythic AI</h1>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Karnataka SSLC Edtech Platform</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-7 md:h-8 text-[10px] md:text-xs">
          <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </header>

      {/* Desktop: Three-panel layout */}
      {!isMobile && (
        <div className="flex-1 flex overflow-hidden bg-muted/10">
          <div className="w-80 border-r border-border bg-card shadow-sm">
            <SourcesPanel
              selectedChapterId={selectedChapterId}
              selectedSubjectId={selectedSubjectId}
              onSelectChapter={setSelectedChapterId}
              onSelectSubject={setSelectedSubjectId}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <ChatPanel selectedChapterId={selectedChapterId} selectedSubjectId={selectedSubjectId} />
          </div>

          <div className="w-80 border-l border-border bg-card shadow-sm">
            <ToolsPanel selectedChapterId={selectedChapterId} selectedSubjectId={selectedSubjectId} />
          </div>
        </div>
      )}

      {/* Mobile: Full-screen chat with bottom navigation */}
      {isMobile && (
        <>
          <div className="flex-1 flex flex-col overflow-hidden pb-16">
            <ChatPanel selectedChapterId={selectedChapterId} selectedSubjectId={selectedSubjectId} />
          </div>
          <MobileNav
            selectedChapterId={selectedChapterId}
            selectedSubjectId={selectedSubjectId}
            onSelectChapter={setSelectedChapterId}
            onSelectSubject={setSelectedSubjectId}
          />
        </>
      )}
    </div>
  );
};
export default StudentDashboard;
