import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Calendar, BookOpen, Loader2 } from "lucide-react";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";
import { toast as sonnerToast } from "sonner";
import { Footer } from "@/components/Footer";

interface CoursBundle {
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
  const [bundles, setBundles] = useState<CoursBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<CoursBundle | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadBundles();
  }, []);

  const checkAuthAndLoadBundles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Check if user already has an active purchase
    const { data: existingPurchase } = await supabase
      .from("student_purchases")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("payment_status", "completed")
      .gt("expires_at", new Date().toISOString())
      .single();

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

  const handleBuyNow = (bundle: CoursBundle) => {
    setSelectedBundle(bundle);
    setPaymentDialogOpen(true);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    if (!selectedBundle || !user) return;

    // Validate dummy card (4242 4242 4242 4242)
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber !== "4242424242424242") {
      toast({
        title: "Invalid Card",
        description: "Please use test card: 4242 4242 4242 4242",
        variant: "destructive",
      });
      return;
    }

    if (!expiry || expiry.length < 5) {
      toast({
        title: "Invalid Expiry",
        description: "Please enter a valid expiry date (MM/YY)",
        variant: "destructive",
      });
      return;
    }

    if (!cvv || cvv.length < 3) {
      toast({
        title: "Invalid CVV",
        description: "Please enter a valid CVV",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + selectedBundle.validity_days);

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from("student_purchases")
      .insert({
        student_id: user.id,
        bundle_id: selectedBundle.id,
        amount_paid: selectedBundle.price_inr,
        payment_status: "completed",
        payment_method: "dummy",
        expires_at: expiresAt.toISOString(),
      });

    if (purchaseError) {
      toast({
        title: "Payment Failed",
        description: "Could not process payment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    // Get all subjects linked to this bundle
    const { data: bundleSubjects } = await supabase
      .from("bundle_subjects")
      .select("subject_id")
      .eq("bundle_id", selectedBundle.id);

    // If no subjects are linked yet, get all subjects
    let subjectIds: string[] = [];
    if (bundleSubjects && bundleSubjects.length > 0) {
      subjectIds = bundleSubjects.map((bs) => bs.subject_id);
    } else {
      // Fallback: Grant access to all subjects
      const { data: allSubjects } = await supabase
        .from("subjects")
        .select("id");
      subjectIds = allSubjects?.map((s) => s.id) || [];
    }

    // Grant access to all subjects in the bundle
    for (const subjectId of subjectIds) {
      await supabase.from("student_subject_access").upsert({
        student_id: user.id,
        subject_id: subjectId,
      }, { onConflict: "student_id,subject_id" });
    }

    toast({
      title: "Payment Successful!",
      description: "Welcome to NythicAI. Your course is now active.",
    });

    setProcessing(false);
    setPaymentDialogOpen(false);
    navigate("/student");
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Inactivity Warning Dialog */}
      <InactivityWarningDialog 
        open={showInactivityWarning} 
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={dismissWarning}
      />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
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
              className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors"
            >
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
                    <Check className="w-4 h-4 text-green-500" />
                    <span>All subjects included</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Video lessons & AI tutoring</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Flashcards & quizzes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
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
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Use test card <code className="bg-muted px-2 py-1 rounded">4242 4242 4242 4242</code> for demo payment
        </p>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              {selectedBundle?.name} - ₹{selectedBundle?.price_inr.toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card">Card Number</Label>
              <Input
                id="card"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ₹{selectedBundle?.price_inr.toLocaleString("en-IN")}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This is a demo payment. Use card: 4242 4242 4242 4242
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer minimal />
    </div>
  );
};

export default SelectCourse;
