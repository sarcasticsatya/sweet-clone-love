import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { Atom, Calculator, Brain, BookOpen } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { Footer } from "@/components/Footer";
import { FloatingIcon } from "@/components/landing/FloatingIcon";

const floatingIcons = [
  { icon: <Atom className="w-full h-full" />, x: 5, y: 15, delay: 0, size: "md" as const },
  { icon: <Calculator className="w-full h-full" />, x: 90, y: 20, delay: 0.5, size: "sm" as const },
  { icon: <Brain className="w-full h-full" />, x: 92, y: 70, delay: 1, size: "md" as const },
  { icon: <BookOpen className="w-full h-full" />, x: 8, y: 80, delay: 1.5, size: "sm" as const },
];

// Zod validation schema for signup
const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  surname: z.string().trim().min(1, "Surname is required").max(50, "Surname must be less than 50 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine(date => {
    const dob = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    return age >= 5 && age <= 100;
  }, "Please enter a valid date of birth (age 5-100)"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be less than 100 characters"),
  schoolName: z.string().trim().min(1, "School name is required").max(200, "School name must be less than 200 characters"),
  medium: z.string().min(1, "Please select medium of instruction"),
  parentMobile: z.string().min(10, "Mobile number must be at least 10 digits").regex(/^(\+91)?[6-9]\d{9}$/, "Please enter a valid Indian mobile number (e.g., 9876543210)"),
  parentEmail: z.string().trim().min(1, "Parent's email is required").email("Please enter a valid parent email address"),
  personalEmail: z.string().trim().min(1, "Your email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const navigate = useNavigate();

  // Sign-up form fields
  const [signupData, setSignupData] = useState({
    firstName: "",
    surname: "",
    dateOfBirth: "",
    city: "",
    schoolName: "",
    medium: "",
    parentMobile: "",
    parentEmail: "",
    personalEmail: "",
    password: ""
  });
  useEffect(() => {
    // Check if user just signed out - skip initial auto-login check
    const justSignedOut = sessionStorage.getItem('just_signed_out');
    if (justSignedOut) {
      sessionStorage.removeItem('just_signed_out');
      // Don't check existing session, just set up listener for new logins
    } else {
      // Only check existing session if not just signed out
      supabase.auth.getSession().then(({
        data: {
          session
        }
      }) => {
        if (session) {
          checkUserStatusAndRedirect(session.user.id);
        }
      });
    }
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect on actual sign-in events, not on initial load or sign-out
      if (event === 'SIGNED_IN' && session) {
        checkUserStatusAndRedirect(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const checkUserStatusAndRedirect = async (userId: string) => {
    // Check user role - retry a few times for newly created users (trigger may take a moment)
    let roleData = null;
    let attempts = 0;
    const maxAttempts = 3;
    while (!roleData && attempts < maxAttempts) {
      const {
        data
      } = await supabase.from("user_roles").select("role").eq("user_id", userId).order('role', {
        ascending: true
      }); // 'admin' comes before 'student' alphabetically

      roleData = data?.[0] || null;
      if (!roleData && attempts < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      attempts++;
    }
    if (!roleData) {
      toast.error("Account setup incomplete. Please try signing in again.");
      await supabase.auth.signOut();
      return;
    }
    if (roleData.role === "admin") {
      navigate("/admin");
      return;
    }

    // For students, check email verification status from student_profiles
    if (roleData.role === "student") {
      const {
        data: studentProfile
      } = await supabase.from("student_profiles").select("email_verified").eq("user_id", userId).single();

      // Check if email is verified (from our custom system)
      if (studentProfile && !studentProfile.email_verified) {
        navigate("/not-verified");
        return;
      }

      // Check if student has an active course purchase
      const {
        data: purchase
      } = await supabase.from("student_purchases").select("*").eq("student_id", userId).eq("payment_status", "completed").gt("expires_at", new Date().toISOString()).single();
      if (!purchase) {
        navigate("/select-course");
        return;
      }
      navigate("/student");
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);
    
    // Check T&C agreement first
    if (!agreedToTerms) {
      toast.error("Please accept the Terms & Conditions to continue");
      setLoading(false);
      return;
    }
    
    try {
      // Validate all fields with Zod
      const result = signupSchema.safeParse(signupData);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          const field = err.path[0] as string;
          if (!errors[field]) {
            errors[field] = err.message;
          }
        });
        setValidationErrors(errors);
        const firstError = result.error.errors[0];
        throw new Error(firstError.message);
      }

      // Create auth user - pass all student data via metadata for trigger
      const {
        error,
        data
      } = await supabase.auth.signUp({
        email: signupData.personalEmail,
        password: signupData.password,
        options: {
          data: {
            full_name: `${signupData.firstName} ${signupData.surname}`,
            first_name: signupData.firstName,
            surname: signupData.surname,
            date_of_birth: signupData.dateOfBirth,
            city: signupData.city,
            school_name: signupData.schoolName,
            medium: signupData.medium,
            parent_mobile: signupData.parentMobile,
            parent_email: signupData.parentEmail
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) throw error;

      // Role is now auto-assigned by database trigger (handle_new_user_role)
      // We just need to send the verification email
      if (data.user) {
        // Send custom verification email via Resend
        try {
          const response = await supabase.functions.invoke("send-verification-email", {
            body: {
              email: signupData.personalEmail,
              firstName: signupData.firstName,
              userId: data.user.id,
              type: "signup"
            }
          });
          if (response.error) {
            console.error("Verification email error:", response.error);
          }
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
        }
      }
      setShowVerificationMessage(true);
      toast.success("Account created! Please check your email to verify.");
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        error,
        data
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Generate and store session ID for single-device enforcement
      if (data.user) {
        const newSessionId = crypto.randomUUID();
        localStorage.setItem('nythic_session_id', newSessionId);

        // Update session in backend (for students only, handled by edge function)
        try {
          await supabase.functions.invoke('update-session', {
            body: {
              sessionId: newSessionId
            }
          });
        } catch (sessionError) {
          console.error('Failed to update session:', sessionError);
          // Don't block login if session update fails
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };
  const updateSignupField = (field: string, value: string) => {
    setSignupData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = {
          ...prev
        };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Show verification message after signup
  if (showVerificationMessage) {
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
        
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center glow-primary">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Check your email!</h2>
              <p className="text-muted-foreground">
                We've sent a verification link to <strong>{signupData.personalEmail}</strong>. 
                Please click the link to verify your account.
              </p>
              <Button variant="outline" onClick={() => setShowVerificationMessage(false)} className="w-full">
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer minimal />
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
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg hover:shadow-xl transition-shadow duration-500">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" className="w-12 h-12" />
            </div>
            <CardTitle className="text-2xl"><BrandName size="xl" /></CardTitle>
            <CardDescription>Your 24x7 Personal Teacher</CardDescription>
          </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={() => navigate("/reset-password")}>
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                {/* Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="firstName" type="text" placeholder="First name" value={signupData.firstName} onChange={e => updateSignupField("firstName", e.target.value)} className={validationErrors.firstName ? "border-destructive" : ""} />
                    {validationErrors.firstName && <p className="text-xs text-destructive">{validationErrors.firstName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surname" className="text-sm">
                      Surname <span className="text-destructive">*</span>
                    </Label>
                    <Input id="surname" type="text" placeholder="Surname" value={signupData.surname} onChange={e => updateSignupField("surname", e.target.value)} className={validationErrors.surname ? "border-destructive" : ""} />
                    {validationErrors.surname && <p className="text-xs text-destructive">{validationErrors.surname}</p>}
                  </div>
                </div>

                {/* DOB and City Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-sm">
                      Date of Birth <span className="text-destructive">*</span>
                    </Label>
                    <Input id="dob" type="date" value={signupData.dateOfBirth} onChange={e => updateSignupField("dateOfBirth", e.target.value)} className={validationErrors.dateOfBirth ? "border-destructive" : ""} />
                    {validationErrors.dateOfBirth && <p className="text-xs text-destructive">{validationErrors.dateOfBirth}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-sm">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input id="city" type="text" placeholder="Your city" value={signupData.city} onChange={e => updateSignupField("city", e.target.value)} className={validationErrors.city ? "border-destructive" : ""} />
                    {validationErrors.city && <p className="text-xs text-destructive">{validationErrors.city}</p>}
                  </div>
                </div>

                {/* School and Medium Row */}
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm">
                    Full School Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="school" type="text" placeholder="Your complete school name" value={signupData.schoolName} onChange={e => updateSignupField("schoolName", e.target.value)} className={validationErrors.schoolName ? "border-destructive" : ""} />
                  {validationErrors.schoolName && <p className="text-xs text-destructive">{validationErrors.schoolName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Medium of Instruction <span className="text-destructive">*</span>
                  </Label>
                  <Select value={signupData.medium} onValueChange={v => updateSignupField("medium", v)}>
                    <SelectTrigger className={validationErrors.medium ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kannada">Kannada</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.medium && <p className="text-xs text-destructive">{validationErrors.medium}</p>}
                </div>

                {/* Parent Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="parentMobile" className="text-sm">
                      Parent's Mobile <span className="text-destructive">*</span>
                    </Label>
                    <Input id="parentMobile" type="tel" placeholder="9876543210" value={signupData.parentMobile} onChange={e => updateSignupField("parentMobile", e.target.value)} className={validationErrors.parentMobile ? "border-destructive" : ""} />
                    {validationErrors.parentMobile && <p className="text-xs text-destructive">{validationErrors.parentMobile}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="parentEmail" className="text-sm">
                      Parent's Email <span className="text-destructive">*</span>
                    </Label>
                    <Input id="parentEmail" type="email" placeholder="parent@email.com" value={signupData.parentEmail} onChange={e => updateSignupField("parentEmail", e.target.value)} className={validationErrors.parentEmail ? "border-destructive" : ""} />
                    {validationErrors.parentEmail && <p className="text-xs text-destructive">{validationErrors.parentEmail}</p>}
                  </div>
                </div>

                {/* Personal Email and Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="personalEmail" className="text-sm">
                    Your Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input id="personalEmail" type="email" placeholder="your@email.com" value={signupData.personalEmail} onChange={e => updateSignupField("personalEmail", e.target.value)} className={validationErrors.personalEmail ? "border-destructive" : ""} />
                  {validationErrors.personalEmail && <p className="text-xs text-destructive">{validationErrors.personalEmail}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input id="signup-password" type="password" placeholder="Minimum 6 characters" value={signupData.password} onChange={e => updateSignupField("password", e.target.value)} className={validationErrors.password ? "border-destructive" : ""} />
                  {validationErrors.password && <p className="text-xs text-destructive">{validationErrors.password}</p>}
                </div>

                {/* Terms & Conditions Agreement */}
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                    I agree to the{" "}
                    <button 
                      type="button"
                      onClick={() => setShowTermsDialog(true)}
                      className="text-primary underline hover:no-underline"
                    >
                      Terms & Conditions
                    </button>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    
    {/* Terms & Conditions Dialog */}
    <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>Please read carefully before accepting</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 max-h-[50vh]">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              This document is an electronic record in terms of Information Technology Act, 2000 and rules
              there under as applicable and the amended provisions pertaining to electronic records in various
              statutes as amended by the Information Technology Act, 2000. This electronic record is generated
              by a computer system and does not require any physical or digital signatures.
            </p>

            <p>
              This document is published in accordance with the provisions of Rule 3 (1) of the Information
              Technology (Intermediaries guidelines) Rules, 2011 that require publishing the rules and
              regulations, privacy policy and Terms of Use for access or usage of domain name https://nythicai.com
              ('Website'), including the related mobile site and mobile application (hereinafter referred to as
              'Platform').
            </p>

            <p>
              The Platform is owned by NythicAI, a company incorporated under the Companies Act, 1956 with
              its registered office at <strong>17-18 2nd floor Maruti Complex Line bazar Dharwad 580001</strong>
              (hereinafter referred to as 'Platform Owner', 'we', 'us', 'our').
            </p>

            <p>
              Your use of the Platform and services and tools are governed by the following terms and
              conditions ("Terms of Use") as applicable to the Platform including the applicable policies which
              are incorporated herein by way of reference. If You transact on the Platform, You shall be subject
              to the policies that are applicable to the Platform for such transaction. By mere use of the Platform,
              You shall be contracting with the Platform Owner and these terms and conditions including the
              policies constitute Your binding obligations, with Platform Owner. These Terms of Use relate to
              your use of our website, goods (as applicable) or services (as applicable) (collectively, 'Services').
            </p>

            <p>
              Any terms and conditions proposed by You which are in addition to or which conflict with these
              Terms of Use are expressly rejected by the Platform Owner and shall be of no force or effect.
              These Terms of Use can be modified at any time without assigning any reason. It is your
              responsibility to periodically review these Terms of Use to stay informed of updates.
            </p>

            <p>
              For the purpose of these Terms of Use, wherever the context so requires 'you', 'your' or 'user' shall
              mean any natural or legal person who has agreed to become a user/buyer on the Platform.
            </p>

            <p className="font-semibold text-foreground">
              ACCESSING, BROWSING OR OTHERWISE USING THE PLATFORM INDICATES YOUR
              AGREEMENT TO ALL THE TERMS AND CONDITIONS UNDER THESE TERMS OF USE,
              SO PLEASE READ THE TERMS OF USE CAREFULLY BEFORE PROCEEDING.
            </p>

            <p>The use of Platform and/or availing of our Services is subject to the following Terms of Use:</p>

            <ol className="list-decimal list-outside ml-6 space-y-3">
              <li>
                To access and use the Services, you agree to provide true, accurate and complete information
                to us during and after registration, and you shall be responsible for all acts done through the
                use of your registered account on the Platform.
              </li>
              <li>
                Neither we nor any third parties provide any warranty or guarantee as to the accuracy,
                timeliness, performance, completeness or suitability of the information and materials offered
                on this website or through the Services, for any specific purpose.
              </li>
              <li>
                Your use of our Services and the Platform is solely and entirely at your own risk and
                discretion for which we shall not be liable to you in any manner.
              </li>
              <li>
                The contents of the Platform and the Services are proprietary to us and are licensed to us.
                You will not have any authority to claim any intellectual property rights, title, or interest in
                its contents.
              </li>
              <li>
                You acknowledge that unauthorized use of the Platform and/or the Services may lead to
                action against you as per these Terms of Use and/or applicable laws.
              </li>
              <li>
                You agree to pay us the charges associated with availing the Services.
              </li>
              <li>
                You agree not to use the Platform and/or Services for any purpose that is unlawful, illegal or
                forbidden by these Terms, or Indian or local laws that might apply to you.
              </li>
              <li>
                You agree and acknowledge that website and the Services may contain links to other third
                party websites. On accessing these links, you will be governed by the terms of use, privacy
                policy and such other policies of such third party websites.
              </li>
              <li>
                You understand that upon initiating a transaction for availing the Services you are entering
                into a legally binding and enforceable contract with the Platform Owner for the Services.
              </li>
              <li>
                You shall indemnify and hold harmless Platform Owner, its affiliates, group companies (as
                applicable) and their respective officers, directors, agents, and employees, from any claim or
                demand, or actions including reasonable attorney's fees.
              </li>
              <li>
                Notwithstanding anything contained in these Terms of Use, the parties shall not be liable for
                any failure to perform an obligation under these Terms if performance is prevented or
                delayed by a force majeure event.
              </li>
              <li>
                These Terms and any dispute or claim relating to it, or its enforceability, shall be governed
                by and construed in accordance with the laws of India.
              </li>
              <li>
                All disputes arising out of or in connection with these Terms shall be subject to the exclusive
                jurisdiction of the courts in Dharwad, Karnataka.
              </li>
              <li>
                All concerns or communications relating to these Terms must be communicated to us using
                the contact information provided on this website.
              </li>
            </ol>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4 pt-4 border-t flex-row gap-2">
          <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
            Close
          </Button>
          <Button onClick={() => {
            setAgreedToTerms(true);
            setShowTermsDialog(false);
          }}>
            Accept Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Footer minimal />
  </div>
  );
};
export default Auth;