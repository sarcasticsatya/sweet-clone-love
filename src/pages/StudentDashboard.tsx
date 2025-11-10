import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, BookOpen } from "lucide-react";
import { SourcesPanel } from "@/components/student/SourcesPanel";
import { ChatPanel } from "@/components/student/ChatPanel";
import { ToolsPanel } from "@/components/student/ToolsPanel";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

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
      <header className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-card shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-medium">NotebookLM</h1>
            <p className="text-[10px] text-muted-foreground">Karnataka SSLC Edition</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 text-xs">
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </header>

      {/* Three-panel NotebookLM layout */}
      <div className="flex-1 flex overflow-hidden bg-muted/10">
        {/* Left: Sources Panel */}
        <SourcesPanel
          selectedChapterId={selectedChapterId}
          selectedSubjectId={selectedSubjectId}
          onSelectChapter={setSelectedChapterId}
          onSelectSubject={setSelectedSubjectId}
        />

        {/* Center: Chat Panel */}
        <ChatPanel
          selectedChapterId={selectedChapterId}
          selectedSubjectId={selectedSubjectId}
        />

        {/* Right: Tools Panel */}
        <ToolsPanel
          selectedChapterId={selectedChapterId}
          selectedSubjectId={selectedSubjectId}
        />
      </div>
    </div>
  );
};

export default StudentDashboard;
