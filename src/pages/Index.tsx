import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { SubjectsSection } from "@/components/landing/SubjectsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/Footer";

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

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <FeaturesSection />
      <SubjectsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
