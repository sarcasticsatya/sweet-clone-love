import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  User, 
  Calendar, 
  MapPin, 
  School, 
  Phone, 
  Mail, 
  BookOpen, 
  CreditCard, 
  Shield, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  MessageCircle,
  Copy
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { format, differenceInDays } from "date-fns";

interface StudentProfile {
  first_name: string;
  surname: string;
  date_of_birth: string;
  city: string;
  school_name: string;
  medium: string;
  parent_mobile: string;
  parent_email: string;
  personal_email: string;
}

interface Purchase {
  id: string;
  amount_paid: number;
  purchased_at: string;
  expires_at: string;
  payment_status: string;
  bundle: {
    name: string;
    name_kannada: string | null;
  } | null;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Load student profile
    const { data: profileData } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Load active purchase with bundle info
    const { data: purchaseData } = await supabase
      .from("student_purchases")
      .select(`
        id,
        amount_paid,
        purchased_at,
        expires_at,
        payment_status,
        bundle_id
      `)
      .eq("student_id", session.user.id)
      .eq("payment_status", "completed")
      .order("purchased_at", { ascending: false })
      .limit(1)
      .single();

    if (purchaseData) {
      // Fetch bundle info separately
      const { data: bundleData } = await supabase
        .from("course_bundles")
        .select("name, name_kannada")
        .eq("id", purchaseData.bundle_id)
        .single();

      setPurchase({
        ...purchaseData,
        bundle: bundleData
      });
    }

    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    }

    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate subscription progress
  const now = new Date();
  const purchaseDate = purchase ? new Date(purchase.purchased_at) : now;
  const expiryDate = purchase ? new Date(purchase.expires_at) : now;
  const totalDays = differenceInDays(expiryDate, purchaseDate);
  const daysRemaining = differenceInDays(expiryDate, now);
  const daysUsed = totalDays - daysRemaining;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, (daysUsed / totalDays) * 100)) : 0;
  const isActive = daysRemaining > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center p-0.5">
            <Logo size="sm" />
          </div>
          <span className="font-medium">Nythic AI</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="w-6 h-6" />
          My Profile
        </h1>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.first_name} {profile?.surname}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {profile?.date_of_birth ? format(new Date(profile.date_of_birth), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{profile?.city || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <School className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">School</p>
                    <p className="font-medium">{profile?.school_name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Medium</p>
                    <p className="font-medium">{profile?.medium || "N/A"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Email</p>
                    <p className="font-medium">{profile?.personal_email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Parent's Email</p>
                    <p className="font-medium">{profile?.parent_email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Parent's Mobile</p>
                    <p className="font-medium">{profile?.parent_mobile || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription Details
              </CardTitle>
              <CardDescription>Your active membership plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchase ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-lg">{purchase.bundle?.name || "Course Bundle"}</p>
                      {purchase.bundle?.name_kannada && (
                        <p className="text-sm text-muted-foreground">{purchase.bundle.name_kannada}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      isActive 
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}>
                      {isActive ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          Expired
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Purchased On</p>
                      <p className="font-medium">{format(purchaseDate, "MMMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires On</p>
                      <p className="font-medium">{format(expiryDate, "MMMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount Paid</p>
                      <p className="font-medium">₹{purchase.amount_paid.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subscription Progress</span>
                      <span className="font-medium">
                        {isActive ? `${daysRemaining} days remaining` : "Expired"}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {daysUsed} of {totalDays} days used ({Math.round(progressPercent)}%)
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No active subscription</p>
                  <Button variant="outline" className="mt-2" onClick={() => navigate("/select-course")}>
                    Browse Courses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Customer Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </CardTitle>
              <CardDescription>Need help? Reach us on WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">+91 82773 23208</span>
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
              <p className="text-xs text-muted-foreground mt-2">
                Save this number and message us on WhatsApp for assistance
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfile;
