import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Users, Video, FileText, BarChart, Download } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManageStudents } from "@/components/admin/ManageStudents";
import { ManageContent } from "@/components/admin/ManageContent";
import { ManageVideos } from "@/components/admin/ManageVideos";
import { ViewReports } from "@/components/admin/ViewReports";
import { DataExport } from "@/components/admin/DataExport";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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

    if (roleData?.role !== "admin") {
      toast.error("Access denied. Admins only.");
      navigate("/auth");
      return;
    }

    setUser(session.user);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('nythic_session_id');
    sessionStorage.setItem('just_signed_out', 'true');
    await supabase.auth.signOut();
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Inactivity Warning Dialog */}
      <InactivityWarningDialog 
        open={showInactivityWarning} 
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={dismissWarning}
      />

      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center p-1">
            <Logo size="md" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Nythic AI Edtech Platform</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="students">
              <Users className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="w-4 h-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <ManageStudents />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <ManageContent />
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <ManageVideos />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ViewReports />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <DataExport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
