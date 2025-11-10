import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });
  }, []);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role === "admin") {
      navigate("/admin");
    } else if (roleData?.role === "student") {
      navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-2xl text-center space-y-8 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Karnataka SSLC
          </h1>
          <h2 className="text-3xl font-semibold text-muted-foreground">
            EdTech Learning Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            AI-powered learning platform for Kannada-medium SSLC students. 
            Access subjects, study materials, and interactive tools.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
