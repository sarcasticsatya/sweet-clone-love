import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";

export const ManageStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
    loadSubjects();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(*)")
      .eq("role", "student");

    if (data) {
      const studentsWithAccess = await Promise.all(
        data.map(async (student) => {
          const { data: access } = await supabase
            .from("student_subject_access")
            .select("subjects(*)")
            .eq("student_id", student.user_id);
          
          return {
            ...student,
            subjects: access?.map(a => a.subjects) || []
          };
        })
      );
      setStudents(studentsWithAccess);
    }
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    
    setSubjects(data || []);
  };

  const handleAssignSubject = async () => {
    if (!selectedStudent || !selectedSubject) {
      toast.error("Please select both student and subject");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("student_subject_access")
      .insert({
        student_id: selectedStudent,
        subject_id: selectedSubject
      });

    if (error) {
      toast.error("Failed to assign subject");
    } else {
      toast.success("Subject assigned successfully");
      setDialogOpen(false);
      loadStudents();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Students
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Assign Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Subject to Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name_kannada} ({subject.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignSubject} disabled={loading} className="w-full">
                  Assign Subject
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Subjects</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.user_id}>
                <TableCell>{student.profiles?.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {student.user_id}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.subjects?.map((subject: any) => (
                      <span key={subject.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {subject.name_kannada}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
