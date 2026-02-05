import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Calendar, BookOpen, Loader2 } from "lucide-react";
import { Atom, Calculator, Brain } from "lucide-react";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";
import { toast as sonnerToast } from "sonner";
import { Footer } from "@/components/Footer";
import { FloatingIcon } from "@/components/landing/FloatingIcon";

const floatingIcons = [
  { icon: <Atom className="w-full h-full" />, x: 5, y: 20, delay: 0, size: "md" as const },
  { icon: <Calculator className="w-full h-full" />, x: 92, y: 30, delay: 0.8, size: "sm" as const },
  { icon: <Brain className="w-full h-full" />, x: 88, y: 75, delay: 1.5, size: "md" as const },
  { icon: <BookOpen className="w-full h-full" />, x: 8, y: 85, delay: 1, size: "sm" as const },
];

interface CourseBundle {
  id: string;
  name: string;
  name_kannada: string | null;
  description: string | null;
  price_inr: number;
  validity_days: number;
}

const SelectCourse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBundleId, setProcessingBundleId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadBundles();
  }, []);

  const checkAuthAndLoadBundles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user already has an active purchase
    const { data: existingPurchase } = await supabase
      .from("student_purchases")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("payment_status", "completed")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingPurchase) {
      navigate("/student");
      return;
    }

    // Load course bundles
    const { data: bundlesData } = await supabase
      .from("course_bundles")
      .select("*")
      .eq("is_active", true);

    setBundles(bundlesData || []);
    setLoading(false);
  };

  const handleBuyNow = async (bundle: CourseBundle) => {
    setProcessingBundleId(bundle.id);

    try {
      const { data, error } = await supabase.functions.invoke('create-phonepe-payment', {
        body: { bundleId: bundle.id }
      });

      if (error) {
        console.error('Payment initiation error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "Could not initiate payment. Please try again.",
          variant: "destructive",
        });
        setProcessingBundleId(null);
        return;
      }

      if (data?.redirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = data.redirectUrl;
      } else {
        console.error('No redirect URL received:', data);
        toast({
          title: "Payment Failed",
          description: data?.error || "Could not get payment URL. Please try again.",
          variant: "destructive",
        });
        setProcessingBundleId(null);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setProcessingBundleId(null);
    }
  };

  // Inactivity auto-logout (30 minutes)
  const handleSignOut = useCallback(async () => {
    localStorage.removeItem('nythic_session_id');
    sessionStorage.setItem('just_signed_out', 'true');
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }, [navigate]);

  const handleInactivityLogout = useCallback(() => {
    sonnerToast.info("You have been logged out due to inactivity");
    handleSignOut();
  }, [handleSignOut]);

  const { showWarning: showInactivityWarning, remainingSeconds, dismissWarning } = useInactivityLogout({
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    onLogout: handleInactivityLogout
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background animate-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-background animate-gradient relative overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Floating icons - hidden on mobile */}
      <div className="hidden md:block">
        {floatingIcons.map((iconProps, index) => (
          <FloatingIcon key={index} {...iconProps} />
        ))}
      </div>
      
      {/* Inactivity Warning Dialog */}
      <InactivityWarningDialog 
        open={showInactivityWarning} 
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={dismissWarning}
      />
      <div className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Course</h1>
          <p className="text-muted-foreground">
            Select a course bundle to start your SSLC preparation journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {bundles.map((bundle) => (
            <Card
              key={bundle.id}
              className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 shadow-lg"
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{bundle.name}</CardTitle>
                    {bundle.name_kannada && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {bundle.name_kannada}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    1 Year
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {bundle.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>All subjects included</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Video lessons & AI tutoring</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Flashcards & quizzes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Mind maps for each chapter</span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <span className="text-3xl font-bold text-foreground">
                          ₹{bundle.price_inr.toLocaleString("en-IN")}
                        </span>
                        <span className="text-muted-foreground text-sm">/year</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleBuyNow(bundle)}
                      disabled={processingBundleId !== null}
                    >
                      {processingBundleId === bundle.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure payment powered by PhonePe
        </p>
      </div>

      <Footer minimal />
    </div>
  );
};

export default SelectCourse;
