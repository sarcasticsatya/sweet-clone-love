import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Upload, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const ManageContent = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Record<string, any[]>>({});
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subject form
  const [subjectName, setSubjectName] = useState("");
  const [subjectNameKannada, setSubjectNameKannada] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  // Chapter form
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [chapterNameKannada, setChapterNameKannada] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
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

  const handleCreateSubject = async () => {
    if (!subjectName || !subjectNameKannada) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("subjects")
      .insert({
        name: subjectName,
        name_kannada: subjectNameKannada,
        description: subjectDescription
      });

    if (error) {
      toast.error("Failed to create subject");
    } else {
      toast.success("Subject created successfully");
      setSubjectDialogOpen(false);
      setSubjectName("");
      setSubjectNameKannada("");
      setSubjectDescription("");
      loadSubjects();
    }
    setLoading(false);
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
        loadSubjects(); // Reload to show updated status
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("PDF extraction failed. Please check the console.");
    }
    setLoading(false);
  };

  const handleUploadChapter = async () => {
    if (!selectedSubjectId || !chapterNumber || !chapterName || !chapterNameKannada || !pdfFile) {
      toast.error("Please fill all fields and select a PDF");
      return;
    }

    setLoading(true);
    try {
      // Upload PDF to storage
      const fileName = `${selectedSubjectId}/${Date.now()}_${pdfFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chapter-pdfs")
        .upload(fileName, pdfFile);

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
          chapter_number: parseInt(chapterNumber),
          name: chapterName,
          name_kannada: chapterNameKannada,
          pdf_url: publicUrl,
          pdf_storage_path: fileName
        })
        .select()
        .single();

      if (insertError) throw insertError;

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
          loadSubjects(); // Reload to show updated status
        }
      }).catch((err) => {
        console.error("PDF extraction error:", err);
        toast.error("PDF extraction failed. Please check the console.");
      });

      toast.success("Chapter uploaded successfully!");
      setChapterDialogOpen(false);
      setSelectedSubjectId("");
      setChapterNumber("");
      setChapterName("");
      setChapterNameKannada("");
      setPdfFile(null);
      loadSubjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload chapter");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Manage Content
          </CardTitle>
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
                  <DialogTitle>Create New Subject</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subject Name (English)</Label>
                    <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Subject Name (Kannada)</Label>
                    <Input value={subjectNameKannada} onChange={(e) => setSubjectNameKannada(e.target.value)} />
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
                  <DialogTitle>Upload Chapter PDF</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Subject</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
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
                  <div>
                    <Label>Chapter Number</Label>
                    <Input type="number" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>Chapter Name (English)</Label>
                    <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Chapter Name (Kannada)</Label>
                    <Input value={chapterNameKannada} onChange={(e) => setChapterNameKannada(e.target.value)} />
                  </div>
                  <div>
                    <Label>PDF File</Label>
                    <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button onClick={handleUploadChapter} disabled={loading} className="w-full">
                    Upload Chapter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {subjects.map((subject) => (
            <AccordionItem key={subject.id} value={subject.id}>
              <div className="flex items-center">
                <AccordionTrigger className="flex-1">
                  {subject.name_kannada} ({subject.name})
                </AccordionTrigger>
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
                        Are you sure you want to delete "{subject.name}"? This will permanently delete all chapters and PDFs associated with this subject. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
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
                          Chapter {chapter.chapter_number}: {chapter.name_kannada}
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
                                  Are you sure you want to delete "Chapter {chapter.chapter_number}: {chapter.name}"? This will permanently delete the chapter and its PDF. This action cannot be undone.
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
      </CardContent>
    </Card>
  );
};