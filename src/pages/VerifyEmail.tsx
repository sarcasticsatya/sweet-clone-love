import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, BookOpen } from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-email-token", {
          body: { token },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success) {
          setStatus("success");
          setMessage(data.message);
          setEmail(data.email || "");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage(err.message || "An error occurred during verification");
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>

          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
              <h2 className="text-xl font-semibold">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we verify your account.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Email Verified!
              </h2>
              <p className="text-muted-foreground">
                {email ? (
                  <>Your email <strong>{email}</strong> has been verified successfully.</>
                ) : (
                  "Your email has been verified successfully."
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                You can now sign in to your account. An admin will review and approve your account shortly.
              </p>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Go to Sign In
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                Verification Failed
              </h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="space-y-2">
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Go to Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate("/not-verified")} className="w-full">
                  Request New Verification Link
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
