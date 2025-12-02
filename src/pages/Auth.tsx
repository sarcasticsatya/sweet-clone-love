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

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserStatusAndRedirect(session.user.id, session.user.email_confirmed_at);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserStatusAndRedirect(session.user.id, session.user.email_confirmed_at);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatusAndRedirect = async (userId: string, emailConfirmed: string | null) => {
    // Check user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role === "admin") {
      navigate("/admin");
      return;
    }

    // For students, check verification status
    if (roleData?.role === "student") {
      // Check if email is verified
      if (!emailConfirmed) {
        navigate("/not-verified");
        return;
      }

      // Check if admin has verified the student
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("is_verified")
        .eq("user_id", userId)
        .single();

      if (studentProfile && !studentProfile.is_verified) {
        navigate("/not-verified");
        return;
      }

      navigate("/student");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate all fields
      if (!signupData.firstName || !signupData.surname || !signupData.dateOfBirth ||
          !signupData.city || !signupData.schoolName || !signupData.medium ||
          !signupData.parentMobile || !signupData.parentEmail || !signupData.personalEmail ||
          !signupData.password) {
        throw new Error("Please fill in all fields");
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

      // Trigger auto-creates student_profiles via handle_new_student_profile()
      // We only need to assign the student role here
      if (data.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: data.user.id,
            role: "student"
          });

        if (roleError) {
          console.error("Role assignment error:", roleError);
        }

        // Send custom verification email via Resend
        try {
          const response = await supabase.functions.invoke("send-verification-email", {
            body: {
              email: signupData.personalEmail,
              firstName: signupData.firstName,
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
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={signupData.firstName}
                      onChange={(e) => updateSignupField("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surname" className="text-sm">Surname</Label>
                    <Input
                      id="surname"
                      type="text"
                      placeholder="Surname"
                      value={signupData.surname}
                      onChange={(e) => updateSignupField("surname", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* DOB and City Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-sm">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={signupData.dateOfBirth}
                      onChange={(e) => updateSignupField("dateOfBirth", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-sm">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Your city"
                      value={signupData.city}
                      onChange={(e) => updateSignupField("city", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* School and Medium Row */}
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm">Full School Name</Label>
                  <Input
                    id="school"
                    type="text"
                    placeholder="Your complete school name"
                    value={signupData.schoolName}
                    onChange={(e) => updateSignupField("schoolName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Medium of Instruction</Label>
                  <Select value={signupData.medium} onValueChange={(v) => updateSignupField("medium", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kannada">Kannada</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Parent Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="parentMobile" className="text-sm">Parent's Mobile</Label>
                    <Input
                      id="parentMobile"
                      type="tel"
                      placeholder="+91 XXXXXXXXXX"
                      value={signupData.parentMobile}
                      onChange={(e) => updateSignupField("parentMobile", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="parentEmail" className="text-sm">Parent's Email</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      placeholder="parent@email.com"
                      value={signupData.parentEmail}
                      onChange={(e) => updateSignupField("parentEmail", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Personal Email and Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="personalEmail" className="text-sm">Your Email Address</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.personalEmail}
                    onChange={(e) => updateSignupField("personalEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={signupData.password}
                    onChange={(e) => updateSignupField("password", e.target.value)}
                    required
                    minLength={6}
                  />
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