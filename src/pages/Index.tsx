import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Copy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className={cn(
        "max-w-2xl text-center",
        isMobile ? "space-y-4 p-4" : "space-y-8 p-8"
      )}>
        {/* Logo - smaller on mobile */}
        <div className="flex justify-center">
          <div className={cn(
            "bg-primary rounded-2xl flex items-center justify-center",
            isMobile ? "w-14 h-14 p-1.5" : "w-20 h-20 p-2"
          )}>
            <Logo size={isMobile ? "md" : "lg"} />
          </div>
        </div>
        
        {/* Title Section - compact on mobile */}
        <div className={isMobile ? "space-y-1" : "space-y-4"}>
          <h1 className={cn(
            "font-bold tracking-tight",
            isMobile ? "text-3xl" : "text-5xl"
          )}>NythicAI</h1>
          <p className="text-sm text-primary font-medium">Your 24x7 Personal Teacher</p>
          <h2 className={cn(
            "font-semibold text-muted-foreground",
            isMobile ? "text-xl" : "text-3xl"
          )}>EdTech Learning Platform</h2>
          
          {/* Hide long description on mobile */}
          {!isMobile && (
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              AI-powered learning platform for SSLC students. Access subjects, study materials, and interactive tools.
            </p>
          )}
        </div>

        {/* CTA Button */}
        <div className="flex gap-4 justify-center">
          <Button size={isMobile ? "default" : "lg"} onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* Compact Footer */}
        <div className={cn(
          "border-t border-border",
          isMobile ? "pt-3 space-y-2" : "pt-6"
        )}>
          {/* Support - inline */}
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
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
          
          {/* Policies - compact row */}
          <div className={cn(
            "flex flex-wrap items-center justify-center text-muted-foreground",
            isMobile ? "gap-2 text-xs mt-2" : "gap-4 text-sm mt-6"
          )}>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-foreground transition-colors">
              Refund
            </Link>
          </div>
          
          <p className={cn(
            "text-muted-foreground",
            isMobile ? "text-xs mt-2" : "text-xs mt-4"
          )}>© 2025 NythicAI</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
