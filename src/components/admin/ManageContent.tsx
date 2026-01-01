import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Plus, Upload, Trash2, Pencil, Eye, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

type Medium = "English" | "Kannada";

export const ManageContent = () => {
  const [selectedMedium, setSelectedMedium] = useState<Medium>("English");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Record<string, any[]>>({});
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editSubjectDialogOpen, setEditSubjectDialogOpen] = useState(false);
  const [editChapterDialogOpen, setEditChapterDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Upload progress
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // PDF Preview
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Subject form
  const [subjectName, setSubjectName] = useState("");
  const [subjectNameKannada, setSubjectNameKannada] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [editingSubject, setEditingSubject] = useState<any>(null);

  // Chapter form
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [chapterNameKannada, setChapterNameKannada] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editingChapter, setEditingChapter] = useState<any>(null);

  useEffect(() => {
    loadSubjects();
  }, [selectedMedium]);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("medium", selectedMedium)
      .order("name");
    
    setSubjects(data || []);
    
    // Load chapters for each subject
    if (data) {
      data.forEach(subject => loadChapters(subject.id));
    }
  };

  const loadChapters = async (subjectId: string) => {
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("chapter_number");
    
    setChapters(prev => ({ ...prev, [subjectId]: data || [] }));
  };

  // Get validation requirements based on selected medium
  const getMandatoryLabel = (isEnglish: boolean) => {
    if (selectedMedium === "English") {
      return isEnglish ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(optional)</span>;
    } else {
      return isEnglish ? <span className="text-muted-foreground text-xs">(optional)</span> : <span className="text-destructive">*</span>;
    }
  };

  const validateSubjectNames = (): boolean => {
    if (selectedMedium === "English" && !subjectName.trim()) {
      toast.error("English name is mandatory for English Medium subjects");
      return false;
    }
    if (selectedMedium === "Kannada" && !subjectNameKannada.trim()) {
      toast.error("Kannada name is mandatory for Kannada Medium subjects");
      return false;
    }
    return true;
  };

  const validateChapterNames = (): boolean => {
    if (selectedMedium === "English" && !chapterName.trim()) {
      toast.error("English name is mandatory for English Medium chapters");
      return false;
    }
    if (selectedMedium === "Kannada" && !chapterNameKannada.trim()) {
      toast.error("Kannada name is mandatory for Kannada Medium chapters");
      return false;
    }
    return true;
  };

  const handleCreateSubject = async () => {
    if (!validateSubjectNames()) return;

    setLoading(true);
    const { error } = await supabase
      .from("subjects")
      .insert({
        name: subjectName || subjectNameKannada,
        name_kannada: subjectNameKannada || subjectName,
        description: subjectDescription,
        medium: selectedMedium
      });

    if (error) {
      toast.error("Failed to create subject");
    } else {
      toast.success("Subject created successfully");
      setSubjectDialogOpen(false);
      resetSubjectForm();
      loadSubjects();
    }
    setLoading(false);
  };

  const handleEditSubject = async () => {
    if (!editingSubject || !validateSubjectNames()) return;

    setLoading(true);
    const { error } = await supabase
      .from("subjects")
      .update({
        name: subjectName || subjectNameKannada,
        name_kannada: subjectNameKannada || subjectName,
        description: subjectDescription
      })
      .eq("id", editingSubject.id);

    if (error) {
      toast.error("Failed to update subject");
    } else {
      toast.success("Subject updated successfully");
      setEditSubjectDialogOpen(false);
      setEditingSubject(null);
      resetSubjectForm();
      loadSubjects();
    }
    setLoading(false);
  };

  const openEditSubjectDialog = (subject: any) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSubjectNameKannada(subject.name_kannada);
    setSubjectDescription(subject.description || "");
    setEditSubjectDialogOpen(true);
  };

  const resetSubjectForm = () => {
    setSubjectName("");
    setSubjectNameKannada("");
    setSubjectDescription("");
    setEditingSubject(null);
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    setLoading(true);
    try {
      // First delete all chapters' PDFs from storage
      const subjectChapters = chapters[subjectId] || [];
      for (const chapter of subjectChapters) {
        if (chapter.pdf_storage_path) {
          await supabase.storage.from("chapter-pdfs").remove([chapter.pdf_storage_path]);
        }
      }

      // Delete subject (chapters will be cascade deleted via foreign key)
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);

      if (error) throw error;

      toast.success(`Subject "${subjectName}" deleted successfully`);
      loadSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    }
    setLoading(false);
  };

  const handleDeleteChapter = async (chapter: any) => {
    setLoading(true);
    try {
      // Delete PDF from storage
      if (chapter.pdf_storage_path) {
        await supabase.storage.from("chapter-pdfs").remove([chapter.pdf_storage_path]);
      }

      // Delete chapter record
      const { error } = await supabase
        .from("chapters")
        .delete()
        .eq("id", chapter.id);

      if (error) throw error;

      toast.success(`Chapter ${chapter.chapter_number} deleted successfully`);
      loadChapters(chapter.subject_id);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete chapter");
    }
    setLoading(false);
  };

  const handleEditChapter = async () => {
    if (!editingChapter || !chapterNumber || !validateChapterNames()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("chapters")
        .update({
          chapter_number: chapterNumber.trim(),
          name: chapterName || chapterNameKannada,
          name_kannada: chapterNameKannada || chapterName
        })
        .eq("id", editingChapter.id);

      if (error) throw error;

      toast.success("Chapter updated successfully");
      setEditChapterDialogOpen(false);
      setEditingChapter(null);
      resetChapterForm();
      loadChapters(editingChapter.subject_id);
    } catch (error: any) {
      toast.error(error.message || "Failed to update chapter");
    }
    setLoading(false);
  };

  const openEditChapterDialog = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterNumber(chapter.chapter_number);
    setChapterName(chapter.name);
    setChapterNameKannada(chapter.name_kannada);
    setEditChapterDialogOpen(true);
  };

  const resetChapterForm = () => {
    setSelectedSubjectId("");
    setChapterNumber("");
    setChapterName("");
    setChapterNameKannada("");
    setPdfFile(null);
    setEditingChapter(null);
  };

  const handleRetryExtraction = async (chapterId: string) => {
    setLoading(true);
    toast.info("Retrying PDF text extraction...");

    try {
      const { data, error } = await supabase.functions.invoke("extract-pdf-text", {
        body: { chapterId }
      });

      if (error) {
        console.error("PDF extraction error:", error);
        toast.error("PDF text extraction failed. Check console for details.");
      } else if (data?.error) {
        console.error("PDF extraction error:", data.error);
        toast.error(`PDF extraction failed: ${data.error}`);
      } else {
        toast.success("PDF text extracted successfully!");
        loadSubjects();
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("PDF extraction failed. Please check the console.");
    }
    setLoading(false);
  };

  const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  const handleUploadChapter = async () => {
    if (!selectedSubjectId || !chapterNumber || !pdfFile) {
      toast.error("Please fill subject, chapter number, and select a PDF");
      return;
    }

    if (!validateChapterNames()) return;

    if (pdfFile.size > MAX_PDF_SIZE) {
      toast.error("PDF file size must be less than 10MB");
      return;
    }

    setLoading(true);
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      // Upload PDF to storage
      const fileName = `${selectedSubjectId}/${Date.now()}_${pdfFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chapter-pdfs")
        .upload(fileName, pdfFile);

      clearInterval(progressInterval);
      setUploadProgress(95);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("chapter-pdfs")
        .getPublicUrl(fileName);

      // Create chapter record
      const { data: chapterData, error: insertError } = await supabase
        .from("chapters")
        .insert({
          subject_id: selectedSubjectId,
          chapter_number: chapterNumber.trim(),
          name: chapterName || chapterNameKannada,
          name_kannada: chapterNameKannada || chapterName,
          pdf_url: publicUrl,
          pdf_storage_path: fileName
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);

      // Trigger PDF text extraction
      toast.success("Chapter uploaded! Extracting text from PDF...");
      
      const extractionPromise = supabase.functions.invoke("extract-pdf-text", {
        body: { chapterId: chapterData.id }
      });
      
      extractionPromise.then(({ data, error }) => {
        if (error) {
          console.error("PDF extraction error:", error);
          toast.error("PDF text extraction failed. Please try uploading again.");
        } else if (data?.error) {
          console.error("PDF extraction error:", data.error);
          toast.error(`PDF extraction failed: ${data.error}`);
        } else {
          toast.success("PDF text extracted successfully!");
          loadSubjects();
        }
      }).catch((err) => {
        console.error("PDF extraction error:", err);
        toast.error("PDF extraction failed. Please check the console.");
      });

      toast.success("Chapter uploaded successfully!");
      setChapterDialogOpen(false);
      resetChapterForm();
      loadSubjects();
    } catch (error: any) {
      clearInterval(progressInterval);
      toast.error(error.message || "Failed to upload chapter");
    }
    setLoading(false);
    setUploading(false);
    setUploadProgress(0);
  };

  // Filter subjects for the current medium
  const filteredSubjects = subjects.filter(s => s.medium === selectedMedium);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Manage Content
            </CardTitle>
          </div>
          
          {/* Medium Selection Tabs */}
          <Tabs value={selectedMedium} onValueChange={(v) => setSelectedMedium(v as Medium)} className="w-full">
            <div className="flex items-center justify-between gap-4">
              <TabsList className="grid w-[300px] grid-cols-2">
                <TabsTrigger value="English">English Medium</TabsTrigger>
                <TabsTrigger value="Kannada">Kannada Medium</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New {selectedMedium} Medium Subject</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedMedium === "English" 
                          ? "English name is mandatory, Kannada is optional"
                          : "Kannada name is mandatory, English is optional"}
                      </p>
                      <div>
                        <Label>Subject Name (English) {getMandatoryLabel(true)}</Label>
                        <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g., Mathematics" />
                      </div>
                      <div>
                        <Label>Subject Name (Kannada) {getMandatoryLabel(false)}</Label>
                        <Input value={subjectNameKannada} onChange={(e) => setSubjectNameKannada(e.target.value)} placeholder="e.g., ಗಣಿತ" />
                      </div>
                      <div>
                        <Label>Description (Optional)</Label>
                        <Input value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} />
                      </div>
                      <Button onClick={handleCreateSubject} disabled={loading} className="w-full">
                        Create Subject
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Chapter PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload {selectedMedium} Medium Chapter PDF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Select Subject</Label>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {selectedMedium === "English" 
                                  ? (subject.name || subject.name_kannada)
                                  : (subject.name_kannada || subject.name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Chapter Number</Label>
                        <Input type="text" placeholder="e.g., 1, 1a, 2.1" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedMedium === "English" 
                          ? "English name is mandatory, Kannada is optional"
                          : "Kannada name is mandatory, English is optional"}
                      </p>
                      <div>
                        <Label>Chapter Name (English) {getMandatoryLabel(true)}</Label>
                        <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Chapter Name (Kannada) {getMandatoryLabel(false)}</Label>
                        <Input value={chapterNameKannada} onChange={(e) => setChapterNameKannada(e.target.value)} />
                      </div>
                      <div>
                        <Label>PDF File (max 10MB)</Label>
                        <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} disabled={uploading} />
                      </div>
                      {uploading && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} className="w-full" />
                          <p className="text-sm text-center text-muted-foreground">
                            Uploading... {Math.round(uploadProgress)}%
                          </p>
                        </div>
                      )}
                      <Button onClick={handleUploadChapter} disabled={loading || uploading} className="w-full">
                        {uploading ? "Uploading..." : "Upload Chapter"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Edit Subject Dialog */}
        <Dialog open={editSubjectDialogOpen} onOpenChange={(open) => {
          setEditSubjectDialogOpen(open);
          if (!open) {
            setEditingSubject(null);
            resetSubjectForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingSubject?.medium === "English" 
                  ? "English name is mandatory, Kannada is optional"
                  : "Kannada name is mandatory, English is optional"}
              </p>
              <div>
                <Label>Subject Name (English) {getMandatoryLabel(true)}</Label>
                <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
              </div>
              <div>
                <Label>Subject Name (Kannada) {getMandatoryLabel(false)}</Label>
                <Input value={subjectNameKannada} onChange={(e) => setSubjectNameKannada(e.target.value)} />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Input value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} />
              </div>
              <Button onClick={handleEditSubject} disabled={loading} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Chapter Dialog */}
        <Dialog open={editChapterDialogOpen} onOpenChange={(open) => {
          setEditChapterDialogOpen(open);
          if (!open) {
            setEditingChapter(null);
            resetChapterForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Chapter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Chapter Number</Label>
                <Input type="text" placeholder="e.g., 1, 1a, 2.1" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedMedium === "English" 
                  ? "English name is mandatory, Kannada is optional"
                  : "Kannada name is mandatory, English is optional"}
              </p>
              <div>
                <Label>Chapter Name (English) {getMandatoryLabel(true)}</Label>
                <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} />
              </div>
              <div>
                <Label>Chapter Name (Kannada) {getMandatoryLabel(false)}</Label>
                <Input value={chapterNameKannada} onChange={(e) => setChapterNameKannada(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                To replace the PDF, delete this chapter and upload a new one.
              </p>
              <Button onClick={handleEditChapter} disabled={loading} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {filteredSubjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No {selectedMedium} medium subjects yet.</p>
            <p className="text-sm">Click "Add Subject" to create one.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredSubjects.map((subject) => (
              <AccordionItem key={subject.id} value={subject.id}>
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1">
                    {selectedMedium === "English" 
                      ? (subject.name || subject.name_kannada)
                      : (subject.name_kannada || subject.name)}
                    {subject.name && subject.name_kannada && (
                      <span className="text-muted-foreground ml-2">
                        ({selectedMedium === "English" ? subject.name_kannada : subject.name})
                      </span>
                    )}
                  </AccordionTrigger>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditSubjectDialog(subject);
                    }}
                    className="mr-1"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-2"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{subject.name || subject.name_kannada}"? This will permanently delete all chapters and PDFs associated with this subject. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSubject(subject.id, subject.name || subject.name_kannada)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    {chapters[subject.id]?.length ? (
                      chapters[subject.id].map((chapter) => (
                        <div key={chapter.id} className="flex items-center justify-between p-2 bg-muted rounded gap-2">
                          <span className="text-sm flex-1">
                            Chapter {chapter.chapter_number}: {selectedMedium === "English" 
                              ? (chapter.name || chapter.name_kannada)
                              : (chapter.name_kannada || chapter.name)}
                          </span>
                          <div className="flex items-center gap-2">
                            {chapter.content_extracted ? (
                              <span className="text-xs text-green-600 dark:text-green-400">✓ Processed</span>
                            ) : (
                              <>
                                <span className="text-xs text-orange-600 dark:text-orange-400">⏳ Pending</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryExtraction(chapter.id)}
                                  disabled={loading}
                                >
                                  Retry
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewPdfUrl(chapter.pdf_url)}
                              title="Preview PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(chapter.pdf_url, '_blank')}
                              title="Open PDF in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditChapterDialog(chapter)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={loading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "Chapter {chapter.chapter_number}: {chapter.name || chapter.name_kannada}"? This will permanently delete the chapter and its PDF. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteChapter(chapter)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No chapters yet</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* PDF Preview Dialog */}
        <Dialog open={!!previewPdfUrl} onOpenChange={() => setPreviewPdfUrl(null)}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>PDF Preview</DialogTitle>
            </DialogHeader>
            <iframe 
              src={previewPdfUrl || ''} 
              className="w-full h-full border rounded"
              title="PDF Preview"
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
