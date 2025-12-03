import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Mail, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";

const NotVerified = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    setUserEmail(session.user.email || null);

    // Check student profile for both email_verified and is_verified (admin)
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("is_verified, email_verified, first_name")
      .eq("user_id", session.user.id)
      .single();

    if (studentProfile) {
      setEmailVerified(studentProfile.email_verified || false);
      setAdminVerified(studentProfile.is_verified || false);
      setFirstName(studentProfile.first_name || "");
    }

    // If both verified, redirect to student dashboard
    if (studentProfile?.email_verified && studentProfile?.is_verified) {
      navigate("/student");
    }
  };

  const handleResendVerification = async () => {
    if (!userEmail || !userId) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("send-verification-email", {
        body: {
          email: userEmail,
          firstName: firstName,
          userId: userId,
          type: "resend",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send email");
      }

      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await checkStatus();
    setLoading(false);
    toast.info("Status refreshed");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Account Pending Verification</CardTitle>
          <CardDescription>
            Your account needs to be verified before you can access the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status indicators */}
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              emailVerified 
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" 
                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
            }`}>
              <Mail className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Email Verification</p>
                <p className="text-xs opacity-80">
                  {emailVerified ? "✓ Email verified" : "Pending - Check your inbox"}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              adminVerified 
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" 
                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
            }`}>
              <ShieldAlert className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Admin Verification</p>
                <p className="text-xs opacity-80">
                  {adminVerified ? "✓ Admin approved" : "Pending - Awaiting admin approval"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {!emailVerified && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResendVerification}
                disabled={loading}
              >
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            If you believe this is an error, please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotVerified;
