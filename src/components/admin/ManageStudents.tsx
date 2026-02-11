import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, CheckCircle2, XCircle, Eye, Settings, BookOpen, Brain, HelpCircle, Sparkles, X, Trash2, AlertTriangle } from "lucide-react";

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

interface Subject {
  id: string;
  name: string;
  name_kannada: string;
  medium: string;
}

interface StudentAccess {
  subject_id: string;
  subject: Subject;
}

export const ManageStudents = () => {
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentAccess, setStudentAccess] = useState<Record<string, string[]>>({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudentProfiles();
    loadSubjects();
  }, []);

  const loadStudentProfiles = async () => {
    // Load student profiles directly
    const { data: profiles } = await supabase
      .from("student_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      setStudentProfiles(profiles);

      // Load access for all students
      const accessMap: Record<string, string[]> = {};
      for (const profile of profiles) {
        const { data: access } = await supabase
          .from("student_subject_access")
          .select("subject_id")
          .eq("student_id", profile.user_id);
        
        accessMap[profile.user_id] = access?.map(a => a.subject_id) || [];
      }
      setStudentAccess(accessMap);
    }
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    
    setSubjects(data || []);
  };

  const openAccessDialog = (profile: StudentProfile) => {
    setSelectedProfile(profile);
    setSelectedSubjects(studentAccess[profile.user_id] || []);
    setAccessDialogOpen(true);
  };

  const viewStudentDetails = (profile: StudentProfile) => {
    setSelectedProfile(profile);
    setDetailsDialogOpen(true);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveAccess = async () => {
    if (!selectedProfile) return;

    setLoading(true);
    const userId = selectedProfile.user_id;
    const currentAccess = studentAccess[userId] || [];

    try {
      // Find subjects to add and remove
      const toAdd = selectedSubjects.filter(id => !currentAccess.includes(id));
      const toRemove = currentAccess.filter(id => !selectedSubjects.includes(id));

      // Remove access
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("student_subject_access")
          .delete()
          .eq("student_id", userId)
          .in("subject_id", toRemove);

        if (removeError) throw removeError;
      }

      // Add access
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("student_subject_access")
          .insert(toAdd.map(subjectId => ({
            student_id: userId,
            subject_id: subjectId
          })));

        if (addError) throw addError;
      }

      toast.success("Student access updated successfully");
      setAccessDialogOpen(false);
      loadStudentProfiles();
    } catch (error) {
      console.error("Error updating access:", error);
      toast.error("Failed to update student access");
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return subjectId;
    
    if (subject.name_kannada && subject.name) {
      return `${subject.name_kannada} (${subject.name})`;
    }
    return subject.name_kannada || subject.name || subjectId;
  };

  // Delete functionality
  const openDeleteDialog = (profile: StudentProfile) => {
    setStudentToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const proceedToFinalConfirmation = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmText("");
    setDeleteConfirmDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    const userId = studentToDelete.user_id;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("delete-student", {
        body: { userId },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success(`Student "${studentToDelete.first_name} ${studentToDelete.surname}" has been deleted successfully`);
      setDeleteConfirmDialogOpen(false);
      setStudentToDelete(null);
      setDeleteConfirmText("");
      loadStudentProfiles();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmDialogOpen(false);
    setStudentToDelete(null);
    setDeleteConfirmText("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Manage Students ({studentProfiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Subjects</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No students registered yet
                  </TableCell>
                </TableRow>
              ) : (
                studentProfiles.map((profile) => {
                  const accessCount = studentAccess[profile.user_id]?.length || 0;
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.first_name} {profile.surname}</p>
                          <p className="text-xs text-muted-foreground">{profile.personal_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {profile.school_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{profile.medium}</Badge>
                      </TableCell>
                      <TableCell>
                        {profile.email_verified ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {studentAccess[profile.user_id]?.slice(0, 2).map((subjectId) => {
                            const subject = subjects.find(s => s.id === subjectId);
                            const displayName = subject?.name || subject?.name_kannada || "...";
                            return (
                              <Badge key={subjectId} variant="secondary" className="text-xs">
                                {displayName}
                              </Badge>
                            );
                          })}
                          {accessCount > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{accessCount - 2} more
                            </Badge>
                          )}
                          {accessCount === 0 && (
                            <span className="text-xs text-muted-foreground italic">No access</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewStudentDetails(profile)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openAccessDialog(profile)}
                            title="Manage Access"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDeleteDialog(profile)}
                            title="Delete Student"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Manage Access Dialog */}
        <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Manage Access for {selectedProfile?.first_name} {selectedProfile?.surname}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Info Card */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">What this student will get access to:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>Chapter PDFs & Content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>AI Chat Assistant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span>Flashcards & Mindmaps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <span>Quizzes & Reports</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Subject Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Subjects to Assign:</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {subjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    return (
                      <label 
                        key={subject.id}
                        htmlFor={`subject-${subject.id}`}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id={`subject-${subject.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSubjects(prev => [...prev, subject.id]);
                              } else {
                                setSelectedSubjects(prev => prev.filter(id => id !== subject.id));
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {subject.name_kannada || subject.name}
                              </p>
                              {subject.name_kannada && subject.name && (
                                <p className="text-xs text-muted-foreground">{subject.name}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {subject.medium}
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </label>
                    );
                  })}
                  {subjects.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground text-sm">
                      No subjects available. Add subjects first.
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Summary */}
              {selectedSubjects.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {selectedSubjects.length} subject(s) will be assigned
                  </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSubjects.map(id => {
                        const subject = subjects.find(s => s.id === id);
                        const displayName = subject?.name || subject?.name_kannada || "Unknown";
                        return (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {displayName}
                            <X 
                              className="w-3 h-3 ml-1 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubject(id);
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setAccessDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAccess} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Saving..." : "Save Access"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Assigned Subjects</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {studentAccess[selectedProfile.user_id]?.map(subjectId => (
                      <Badge key={subjectId} variant="secondary">
                        {getSubjectName(subjectId)}
                      </Badge>
                    ))}
                    {(studentAccess[selectedProfile.user_id]?.length || 0) === 0 && (
                      <span className="text-sm text-muted-foreground italic">No subjects assigned</span>
                    )}
                  </div>
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

                <Button 
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    openAccessDialog(selectedProfile);
                  }}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Access
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* First Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={cancelDelete}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Delete Student
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to delete this student?
              </DialogDescription>
            </DialogHeader>
            
            {studentToDelete && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium">{studentToDelete.first_name} {studentToDelete.surname}</p>
                  <p className="text-sm text-muted-foreground">{studentToDelete.personal_email}</p>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-destructive">This action will permanently delete:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Student profile and personal information</li>
                    <li>All quiz attempts and scores</li>
                    <li>All chat history with AI assistant</li>
                    <li>All subject access permissions</li>
                  </ul>
                </div>

                <p className="text-sm text-destructive font-medium">
                  This action cannot be undone!
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={proceedToFinalConfirmation}>
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Second Delete Confirmation Dialog - Type DELETE */}
        <Dialog open={deleteConfirmDialogOpen} onOpenChange={cancelDelete}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Final Confirmation Required
              </DialogTitle>
              <DialogDescription className="pt-2">
                This is your last chance to cancel. Type <strong>DELETE</strong> to confirm.
              </DialogDescription>
            </DialogHeader>
            
            {studentToDelete && (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-center">
                    You are about to permanently delete <strong>{studentToDelete.first_name} {studentToDelete.surname}</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm">
                    Type DELETE to confirm:
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteStudent}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
