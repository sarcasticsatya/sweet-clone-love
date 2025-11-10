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
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Karnataka SSLC</h1>
            <p className="text-xs text-muted-foreground">Learning Platform</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </header>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
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
