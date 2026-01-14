import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Clock, Mail, User, MessageCircle, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/Logo";
import { SourcesPanel } from "@/components/student/SourcesPanel";
import { ChatPanel } from "@/components/student/ChatPanel";
import { ToolsPanel } from "@/components/student/ToolsPanel";
import { MobileNav } from "@/components/student/MobileNav";
import { SessionExpiredDialog } from "@/components/student/SessionExpiredDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [hasSubjectAccess, setHasSubjectAccess] = useState<boolean | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [sessionInvalid, setSessionInvalid] = useState(false);

  const validateSession = useCallback(async () => {
    const sessionId = localStorage.getItem('nythic_session_id');
    if (!sessionId) {
      // No session ID means old login - don't kick them out, just skip validation
      return;
    }

    try {
      const { data } = await supabase.functions.invoke('validate-session', {
        body: { sessionId }
      });

      if (data && !data.valid) {
        console.log('Session invalidated:', data.reason);
        setSessionInvalid(true);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // Don't kick user out on network errors
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  // Session validation: check on mount and every 30 seconds
  useEffect(() => {
    if (user) {
      validateSession();
      const interval = setInterval(validateSession, 30000);
      return () => clearInterval(interval);
    }
  }, [user, validateSession]);

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
    localStorage.removeItem('nythic_session_id');
    // Set flag to prevent auto-login on auth page
    sessionStorage.setItem('just_signed_out', 'true');
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleSessionExpiredSignIn = () => {
    localStorage.removeItem('nythic_session_id');
    sessionStorage.setItem('just_signed_out', 'true');
    supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  // Inactivity auto-logout (30 minutes)
  const handleInactivityLogout = useCallback(() => {
    toast.info("You have been logged out due to inactivity");
    handleSignOut();
  }, []);

  const { showWarning: showInactivityWarning, remainingSeconds, dismissWarning } = useInactivityLogout({
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    onLogout: handleInactivityLogout
  });

  if (!user) return null;

  // Show waiting for admin state if no subject access
  if (hasSubjectAccess === false) {
    return (
      <div className="min-h-screen h-[100dvh] flex flex-col bg-background">
        <header className="border-b border-border px-3 md:px-4 py-2.5 flex items-center justify-between bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-7 md:h-7 bg-primary rounded flex items-center justify-center p-0.5">
              <Logo size="sm" />
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
    <div className="min-h-screen h-[100dvh] flex flex-col bg-background">
      {/* Session Expired Dialog */}
      <SessionExpiredDialog open={sessionInvalid} onSignIn={handleSessionExpiredSignIn} />
      
      {/* Inactivity Warning Dialog */}
      <InactivityWarningDialog 
        open={showInactivityWarning} 
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={dismissWarning}
      />

      {/* NotebookLM-style Header */}
      <header className="border-b border-border px-3 md:px-4 py-2.5 flex items-center justify-between bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-7 md:h-7 bg-primary rounded flex items-center justify-center p-0.5">
            <Logo size="sm" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-medium">Nythic AI</h1>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Karnataka SSLC Edtech Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs">
                <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Support</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium">Contact Support</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">+91 82773 23208</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText("8277323208");
                      toast.success("Phone number copied!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">WhatsApp only</p>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="h-7 md:h-8 text-[10px] md:text-xs">
            <User className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Profile</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-7 md:h-8 text-[10px] md:text-xs">
            <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Desktop: Three-panel layout */}
      {!isMobile && (
        <div className="flex-1 flex overflow-hidden bg-muted/10" style={{ height: 'calc(100dvh - 56px)' }}>
          <div className="w-80 border-r border-border bg-card shadow-sm overflow-hidden">
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

          <div className="w-80 border-l border-border bg-card shadow-sm overflow-hidden">
            <ToolsPanel selectedChapterId={selectedChapterId} selectedSubjectId={selectedSubjectId} />
          </div>
        </div>
      )}

      {/* Mobile: Full-screen chat with bottom navigation */}
      {isMobile && (
        <>
          <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 56px)', paddingBottom: '72px' }}>
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
