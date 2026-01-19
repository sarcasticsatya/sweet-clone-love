import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Copy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });
  }, []);
  const checkUserRoleAndRedirect = async (userId: string) => {
    const {
      data: roleData
    } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (roleData?.role === "admin") {
      navigate("/admin");
    } else if (roleData?.role === "student") {
      navigate("/student");
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-2xl text-center space-y-8 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center p-2">
            <Logo size="lg" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">NythicAI</h1>
          <h2 className="text-3xl font-semibold text-muted-foreground">
            EdTech Learning Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            AI-powered learning platform for English and Kannada medium SSLC students. 
            Access subjects, study materials, and interactive tools.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* Customer Support */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Contact Support</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-muted-foreground">+91 82773 23208</span>
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
        </div>
      </div>
    </div>;
};
export default Index;