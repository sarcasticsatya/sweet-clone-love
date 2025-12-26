import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Loader2, CheckCircle2, Mail } from "lucide-react";
import { z } from "zod";

// Zod validation schema for signup
const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  surname: z.string().trim().min(1, "Surname is required").max(50, "Surname must be less than 50 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((date) => {
    const dob = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    return age >= 5 && age <= 100;
  }, "Please enter a valid date of birth (age 5-100)"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be less than 100 characters"),
  schoolName: z.string().trim().min(1, "School name is required").max(200, "School name must be less than 200 characters"),
  medium: z.string().min(1, "Please select medium of instruction"),
  parentMobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .regex(/^(\+91)?[6-9]\d{9}$/, "Please enter a valid Indian mobile number (e.g., 9876543210)"),
  parentEmail: z.string().trim().min(1, "Parent's email is required").email("Please enter a valid parent email address"),
  personalEmail: z.string().trim().min(1, "Your email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
    password: "",
  });

  useEffect(() => {
    // Check if user just signed out - skip initial auto-login check
    const justSignedOut = sessionStorage.getItem('just_signed_out');
    if (justSignedOut) {
      sessionStorage.removeItem('just_signed_out');
      // Don't check existing session, just set up listener for new logins
    } else {
      // Only check existing session if not just signed out
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          checkUserStatusAndRedirect(session.user.id);
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      
      roleData = data;
      
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
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("email_verified")
        .eq("user_id", userId)
        .single();

      // Check if email is verified (from our custom system)
      if (studentProfile && !studentProfile.email_verified) {
        navigate("/not-verified");
        return;
      }

      // Check if student has an active course purchase
      const { data: purchase } = await supabase
        .from("student_purchases")
        .select("*")
        .eq("student_id", userId)
        .eq("payment_status", "completed")
        .gt("expires_at", new Date().toISOString())
        .single();

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

    try {
      // Validate all fields with Zod
      const result = signupSchema.safeParse(signupData);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
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
      const { error, data } = await supabase.auth.signUp({
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
            parent_email: signupData.parentEmail,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
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
              type: "signup",
            },
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const updateSignupField = (field: string, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Show verification message after signup
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Check your email!</h2>
            <p className="text-muted-foreground">
              We've sent a verification link to <strong>{signupData.personalEmail}</strong>. 
              Please click the link to verify your account.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowVerificationMessage(false)}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Nythic AI</CardTitle>
          <CardDescription>Sign in to access your learning platform</CardDescription>
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
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
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
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={signupData.firstName}
                      onChange={(e) => updateSignupField("firstName", e.target.value)}
                      className={validationErrors.firstName ? "border-destructive" : ""}
                    />
                    {validationErrors.firstName && (
                      <p className="text-xs text-destructive">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surname" className="text-sm">
                      Surname <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="surname"
                      type="text"
                      placeholder="Surname"
                      value={signupData.surname}
                      onChange={(e) => updateSignupField("surname", e.target.value)}
                      className={validationErrors.surname ? "border-destructive" : ""}
                    />
                    {validationErrors.surname && (
                      <p className="text-xs text-destructive">{validationErrors.surname}</p>
                    )}
                  </div>
                </div>

                {/* DOB and City Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-sm">
                      Date of Birth <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={signupData.dateOfBirth}
                      onChange={(e) => updateSignupField("dateOfBirth", e.target.value)}
                      className={validationErrors.dateOfBirth ? "border-destructive" : ""}
                    />
                    {validationErrors.dateOfBirth && (
                      <p className="text-xs text-destructive">{validationErrors.dateOfBirth}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-sm">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Your city"
                      value={signupData.city}
                      onChange={(e) => updateSignupField("city", e.target.value)}
                      className={validationErrors.city ? "border-destructive" : ""}
                    />
                    {validationErrors.city && (
                      <p className="text-xs text-destructive">{validationErrors.city}</p>
                    )}
                  </div>
                </div>

                {/* School and Medium Row */}
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm">
                    Full School Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="school"
                    type="text"
                    placeholder="Your complete school name"
                    value={signupData.schoolName}
                    onChange={(e) => updateSignupField("schoolName", e.target.value)}
                    className={validationErrors.schoolName ? "border-destructive" : ""}
                  />
                  {validationErrors.schoolName && (
                    <p className="text-xs text-destructive">{validationErrors.schoolName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Medium of Instruction <span className="text-destructive">*</span>
                  </Label>
                  <Select value={signupData.medium} onValueChange={(v) => updateSignupField("medium", v)}>
                    <SelectTrigger className={validationErrors.medium ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kannada">Kannada</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.medium && (
                    <p className="text-xs text-destructive">{validationErrors.medium}</p>
                  )}
                </div>

                {/* Parent Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="parentMobile" className="text-sm">
                      Parent's Mobile <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="parentMobile"
                      type="tel"
                      placeholder="9876543210"
                      value={signupData.parentMobile}
                      onChange={(e) => updateSignupField("parentMobile", e.target.value)}
                      className={validationErrors.parentMobile ? "border-destructive" : ""}
                    />
                    {validationErrors.parentMobile && (
                      <p className="text-xs text-destructive">{validationErrors.parentMobile}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="parentEmail" className="text-sm">
                      Parent's Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      placeholder="parent@email.com"
                      value={signupData.parentEmail}
                      onChange={(e) => updateSignupField("parentEmail", e.target.value)}
                      className={validationErrors.parentEmail ? "border-destructive" : ""}
                    />
                    {validationErrors.parentEmail && (
                      <p className="text-xs text-destructive">{validationErrors.parentEmail}</p>
                    )}
                  </div>
                </div>

                {/* Personal Email and Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="personalEmail" className="text-sm">
                    Your Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.personalEmail}
                    onChange={(e) => updateSignupField("personalEmail", e.target.value)}
                    className={validationErrors.personalEmail ? "border-destructive" : ""}
                  />
                  {validationErrors.personalEmail && (
                    <p className="text-xs text-destructive">{validationErrors.personalEmail}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={signupData.password}
                    onChange={(e) => updateSignupField("password", e.target.value)}
                    className={validationErrors.password ? "border-destructive" : ""}
                  />
                  {validationErrors.password && (
                    <p className="text-xs text-destructive">{validationErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;