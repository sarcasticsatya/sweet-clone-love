import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CourseBundle {
  id: string;
  name: string;
  name_kannada: string | null;
  description: string | null;
  price_inr: number;
  validity_days: number;
  is_active: boolean;
  created_at: string;
}

export const ManageCourses = () => {
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBundle, setEditingBundle] = useState<CourseBundle | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_kannada: "",
    description: "",
    price_inr: "",
    validity_days: "",
    is_active: true,
  });

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    const { data, error } = await supabase
      .from("course_bundles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load courses");
    } else {
      setBundles(data || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingBundle(null);
    setForm({ name: "", name_kannada: "", description: "", price_inr: "", validity_days: "365", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (bundle: CourseBundle) => {
    setEditingBundle(bundle);
    setForm({
      name: bundle.name,
      name_kannada: bundle.name_kannada || "",
      description: bundle.description || "",
      price_inr: String(bundle.price_inr),
      validity_days: String(bundle.validity_days),
      is_active: bundle.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price_inr || !form.validity_days) {
      toast.error("Name, price, and validity are required");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      name_kannada: form.name_kannada || null,
      description: form.description || null,
      price_inr: Number(form.price_inr),
      validity_days: Number(form.validity_days),
      is_active: form.is_active,
    };

    if (editingBundle) {
      const { error } = await supabase
        .from("course_bundles")
        .update(payload)
        .eq("id", editingBundle.id);
      if (error) toast.error("Failed to update course");
      else toast.success("Course updated");
    } else {
      const { error } = await supabase
        .from("course_bundles")
        .insert(payload);
      if (error) toast.error("Failed to create course");
      else toast.success("Course created");
    }

    setSaving(false);
    setDialogOpen(false);
    loadBundles();
  };

  const toggleActive = async (bundle: CourseBundle) => {
    const { error } = await supabase
      .from("course_bundles")
      .update({ is_active: !bundle.is_active })
      .eq("id", bundle.id);
    if (error) toast.error("Failed to update status");
    else loadBundles();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Course Bundles
        </CardTitle>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Course
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundles.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{b.name}</p>
                    {b.name_kannada && <p className="text-xs text-muted-foreground">{b.name_kannada}</p>}
                  </div>
                </TableCell>
                <TableCell>₹{b.price_inr.toLocaleString("en-IN")}</TableCell>
                <TableCell>{b.validity_days} days</TableCell>
                <TableCell>
                  <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {bundles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No course bundles yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBundle ? "Edit Course" : "Add New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SSLC English Medium - 6 Months" />
            </div>
            <div className="space-y-2">
              <Label>Name (Kannada)</Label>
              <Input value={form.name_kannada} onChange={(e) => setForm({ ...form, name_kannada: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price_inr} onChange={(e) => setForm({ ...form, price_inr: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Validity (days)</Label>
                <Input type="number" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingBundle ? "Save Changes" : "Create Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
