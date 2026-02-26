import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Calendar, BookOpen, Loader2, Tag, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Atom, Calculator, Brain } from "lucide-react";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";
import { toast as sonnerToast } from "sonner";
import { Footer } from "@/components/Footer";
import { FloatingIcon } from "@/components/landing/FloatingIcon";
import { CountdownTimer } from "@/components/CountdownTimer";

const floatingIcons = [
  { icon: <Atom className="w-full h-full" />, x: 5, y: 20, delay: 0, size: "md" as const },
  { icon: <Calculator className="w-full h-full" />, x: 92, y: 30, delay: 0.8, size: "sm" as const },
  { icon: <Brain className="w-full h-full" />, x: 88, y: 75, delay: 1.5, size: "md" as const },
  { icon: <BookOpen className="w-full h-full" />, x: 8, y: 85, delay: 1, size: "sm" as const },
];

const DEFAULT_FEATURES = [
  "All subjects included",
  "Video lessons & AI tutoring",
  "Flashcards & quizzes",
  "Mind maps for each chapter",
];

interface CourseBundle {
  id: string;
  name: string;
  name_kannada: string | null;
  description: string | null;
  price_inr: number;
  discount_price_inr: number | null;
  discount_expires_at: string | null;
  validity_days: number;
  features: string[] | null;
}

const isDiscountActive = (b: CourseBundle) =>
  b.discount_price_inr != null && b.discount_expires_at && new Date(b.discount_expires_at) > new Date();

const getDiscountPercent = (original: number, discounted: number) =>
  Math.round(((original - discounted) / original) * 100);

const SelectCourse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBundleId, setProcessingBundleId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount_percent: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => { checkAuthAndLoadBundles(); }, []);

  const checkAuthAndLoadBundles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: existingPurchase } = await supabase
      .from("student_purchases")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("payment_status", "completed")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingPurchase) { navigate("/student"); return; }

    const { data: bundlesData } = await supabase
      .from("course_bundles")
      .select("*")
      .eq("is_active", true);

    setBundles((bundlesData || []).map((d: any) => ({ ...d, features: d.features as string[] | null })));
    setLoading(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    const { data, error } = await supabase
      .from("coupon_codes")
      .select("code, discount_percent, max_uses, used_count, valid_until, is_active")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Invalid Coupon", description: "This coupon code is not valid.", variant: "destructive" });
      setCouponApplied(null);
    } else if (data.valid_until && new Date(data.valid_until) < new Date()) {
      toast({ title: "Coupon Expired", description: "This coupon has expired.", variant: "destructive" });
      setCouponApplied(null);
    } else if (data.max_uses !== null && data.used_count >= data.max_uses) {
      toast({ title: "Coupon Limit Reached", description: "This coupon has reached its usage limit.", variant: "destructive" });
      setCouponApplied(null);
    } else {
      setCouponApplied({ code: data.code, discount_percent: data.discount_percent });
      toast({ title: "Coupon Applied!", description: `${data.discount_percent}% discount applied.` });
    }
    setValidatingCoupon(false);
  };

  const handleBuyNow = async (bundle: CourseBundle) => {
    setProcessingBundleId(bundle.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-phonepe-payment', {
        body: { bundleId: bundle.id, couponCode: couponApplied?.code || undefined }
      });
      if (error) {
        toast({ title: "Payment Failed", description: error.message || "Could not initiate payment. Please try again.", variant: "destructive" });
        setProcessingBundleId(null);
        return;
      }
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast({ title: "Payment Failed", description: data?.error || "Could not get payment URL. Please try again.", variant: "destructive" });
        setProcessingBundleId(null);
      }
    } catch (error) {
      toast({ title: "Payment Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      setProcessingBundleId(null);
    }
  };

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
    timeoutMs: 30 * 60 * 1000,
    onLogout: handleInactivityLogout
  });

  /** Calculate the effective price for a bundle considering discount + coupon */
  const getEffectivePrice = (bundle: CourseBundle) => {
    const basePrice = isDiscountActive(bundle) ? bundle.discount_price_inr! : bundle.price_inr;
    if (couponApplied) {
      return Math.round(basePrice * (1 - couponApplied.discount_percent / 100));
    }
    return basePrice;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background animate-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-background animate-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="hidden md:block">
        {floatingIcons.map((iconProps, index) => (
          <FloatingIcon key={index} {...iconProps} />
        ))}
      </div>
      <InactivityWarningDialog open={showInactivityWarning} remainingSeconds={remainingSeconds} onStayLoggedIn={dismissWarning} />

      <div className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Course</h1>
          <p className="text-muted-foreground">Select a course bundle to start your SSLC preparation journey</p>
        </div>

        {/* Coupon Code Input */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="pl-9 uppercase" disabled={!!couponApplied} />
            </div>
            {couponApplied ? (
              <Button variant="outline" onClick={() => { setCouponApplied(null); setCouponCode(""); }}>Remove</Button>
            ) : (
              <Button variant="secondary" onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            )}
          </div>
          {couponApplied && (
            <p className="text-sm text-green-600 mt-1">✓ {couponApplied.discount_percent}% discount applied</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {bundles.map((bundle) => {
            const discountActive = isDiscountActive(bundle);
            const effectivePrice = getEffectivePrice(bundle);
            const showStrike = discountActive || !!couponApplied;

            return (
              <Card key={bundle.id} className="group relative overflow-hidden border-2 border-transparent hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Discount badge */}
                {discountActive && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-destructive text-destructive-foreground font-bold text-sm px-2 py-1 flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {getDiscountPercent(bundle.price_inr, bundle.discount_price_inr!)}% OFF
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between pr-16">
                    <div>
                      <CardTitle className="text-xl">{bundle.name}</CardTitle>
                      {bundle.name_kannada && (
                        <p className="text-sm text-muted-foreground mt-1">{bundle.name_kannada}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {bundle.validity_days} days
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{bundle.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(bundle.features && bundle.features.length > 0 ? bundle.features : DEFAULT_FEATURES).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      {/* Countdown timer */}
                      {discountActive && bundle.discount_expires_at && (
                        <div className="mb-3">
                          <CountdownTimer expiresAt={bundle.discount_expires_at} />
                        </div>
                      )}

                      <div className="flex items-end justify-between mb-4">
                        <div>
                          {showStrike ? (
                            <>
                              <span className="text-lg line-through text-muted-foreground">
                                ₹{bundle.price_inr.toLocaleString("en-IN")}
                              </span>
                              <span className="text-3xl font-bold text-foreground ml-2">
                                ₹{effectivePrice.toLocaleString("en-IN")}
                              </span>
                            </>
                          ) : (
                            <span className="text-3xl font-bold text-foreground">
                              ₹{bundle.price_inr.toLocaleString("en-IN")}
                            </span>
                          )}
                          <span className="text-muted-foreground text-sm">/{bundle.validity_days >= 365 ? "year" : `${bundle.validity_days} days`}</span>
                        </div>
                      </div>
                      <Button className="w-full" size="lg" onClick={() => handleBuyNow(bundle)} disabled={processingBundleId !== null}>
                        {processingBundleId === bundle.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                        ) : (
                          <><CreditCard className="w-4 h-4 mr-2" />Buy Now</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">Secure payment powered by PhonePe</p>
      </div>
      <Footer minimal />
    </div>
  );
};

export default SelectCourse;
