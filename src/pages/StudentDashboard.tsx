import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, BookOpen, Clock, Mail } from "lucide-react";
import { SourcesPanel } from "@/components/student/SourcesPanel";
import { ChatPanel } from "@/components/student/ChatPanel";
import { ToolsPanel } from "@/components/student/ToolsPanel";
import { MobileNav } from "@/components/student/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [hasSubjectAccess, setHasSubjectAccess] = useState<boolean | null>(null);
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

    // Check if student has any subject access
    const { data: accessData } = await supabase
      .from("student_subject_access")
      .select("subject_id")
      .eq("student_id", session.user.id);

    setHasSubjectAccess(accessData && accessData.length > 0);
    setUser(session.user);
  };

  const handleSignOut = async () => {
    setUser(null);
    // Set flag to prevent auto-login on auth page
    sessionStorage.setItem('just_signed_out', 'true');
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (!user) return null;

  // Show waiting for admin state if no subject access
  if (hasSubjectAccess === false) {
    return (
      <div className="h-screen flex flex-col bg-background">
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

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Almost There!</h2>
              <p className="text-muted-foreground">
                Your account is set up, but you haven't been assigned to any subjects yet.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">What to do next:</p>
              <div className="flex items-start gap-3 text-left">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Contact your administrator and ask them to assign you to your class subjects.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once assigned, refresh this page to access your learning materials.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
