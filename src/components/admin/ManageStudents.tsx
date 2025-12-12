import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users, Plus, CheckCircle2, XCircle, Eye } from "lucide-react";

interface StudentProfile {
  id: string;
  user_id: string;
  first_name: string;
  surname: string;
  date_of_birth: string;
  city: string;
  school_name: string;
  medium: string;
  parent_mobile: string;
  parent_email: string;
  personal_email: string;
  email_verified: boolean;
  created_at: string;
}

export const ManageStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
    loadSubjects();
    loadStudentProfiles();
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

  const loadStudentProfiles = async () => {
    const { data } = await supabase
      .from("student_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    setStudentProfiles(data || []);
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

  const viewStudentDetails = (profile: StudentProfile) => {
    setSelectedProfile(profile);
    setDetailsDialogOpen(true);
  };

  const getProfileForUser = (userId: string) => {
    return studentProfiles.find(p => p.user_id === userId);
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
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const profile = getProfileForUser(student.user_id);
                return (
                  <TableRow key={student.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.personal_email || student.user_id.slice(0, 8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {profile?.school_name || "-"}
                    </TableCell>
                    <TableCell>
                      {profile?.email_verified ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Email Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          <XCircle className="w-3 h-3 mr-1" />
                          Pending Email
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.subjects?.map((subject: any) => (
                          <span key={subject.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {subject.name_kannada}
                          </span>
                        ))}
                        {student.subjects?.length === 0 && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewStudentDetails(profile)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Student Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">First Name</Label>
                    <p className="font-medium">{selectedProfile.first_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Surname</Label>
                    <p className="font-medium">{selectedProfile.surname}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">{new Date(selectedProfile.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="font-medium">{selectedProfile.city}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">School Name</Label>
                  <p className="font-medium">{selectedProfile.school_name}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Medium</Label>
                  <p className="font-medium">{selectedProfile.medium}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Parent Mobile</Label>
                    <p className="font-medium">{selectedProfile.parent_mobile}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Parent Email</Label>
                    <p className="font-medium text-sm">{selectedProfile.parent_email}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Personal Email</Label>
                  <p className="font-medium">{selectedProfile.personal_email}</p>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email Status</span>
                    {selectedProfile.email_verified ? (
                      <Badge variant="default" className="bg-green-500">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};