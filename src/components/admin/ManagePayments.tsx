import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, IndianRupee, Search } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface PaymentRecord {
  id: string;
  student_id: string;
  amount_paid: number;
  purchased_at: string;
  expires_at: string;
  payment_status: string;
  coupon_code_applied: string | null;
  discount_amount: number | null;
  student_name: string;
  bundle_name: string;
  validity_days: number;
}

export const ManagePayments = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    // Fetch purchases
    const { data: purchases, error } = await supabase
      .from("student_purchases")
      .select("*")
      .order("purchased_at", { ascending: false });

    if (error || !purchases) {
      setLoading(false);
      return;
    }

    // Fetch student profiles and bundles
    const studentIds = [...new Set(purchases.map(p => p.student_id))];
    const bundleIds = [...new Set(purchases.map(p => p.bundle_id))];

    const [profilesRes, bundlesRes] = await Promise.all([
      supabase.from("student_profiles").select("user_id, first_name, surname").in("user_id", studentIds),
      supabase.from("course_bundles").select("id, name, validity_days").in("id", bundleIds),
    ]);

    const profileMap = new Map(
      (profilesRes.data || []).map(p => [p.user_id, `${p.first_name} ${p.surname}`])
    );
    const bundleMap = new Map(
      (bundlesRes.data || []).map(b => [b.id, { name: b.name, validity_days: b.validity_days }])
    );

    setPayments(purchases.map(p => ({
      id: p.id,
      student_id: p.student_id,
      amount_paid: p.amount_paid,
      purchased_at: p.purchased_at,
      expires_at: p.expires_at,
      payment_status: p.payment_status,
      coupon_code_applied: (p as any).coupon_code_applied || null,
      discount_amount: (p as any).discount_amount || null,
      student_name: profileMap.get(p.student_id) || "Unknown",
      bundle_name: bundleMap.get(p.bundle_id)?.name || "Unknown",
      validity_days: bundleMap.get(p.bundle_id)?.validity_days || 0,
    })));

    setLoading(false);
  };

  const filtered = payments.filter(p => {
    const matchesSearch = p.student_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColor = (status: string) => {
    if (status === "completed") return "default";
    if (status === "pending") return "secondary";
    return "destructive";
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Days Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const daysLeft = differenceInDays(new Date(p.expires_at), new Date());
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.student_name}</TableCell>
                    <TableCell>{p.bundle_name}</TableCell>
                    <TableCell>₹{p.amount_paid.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {p.discount_amount && p.discount_amount > 0
                        ? `₹${p.discount_amount} (${p.coupon_code_applied})`
                        : "—"}
                    </TableCell>
                    <TableCell>{format(new Date(p.purchased_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(p.payment_status)}>
                        {p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.validity_days} days</TableCell>
                    <TableCell>{format(new Date(p.expires_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {p.payment_status === "completed" ? (
                        <span className={daysLeft > 0 ? "text-green-600" : "text-destructive"}>
                          {daysLeft > 0 ? `${daysLeft} days` : "Expired"}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
