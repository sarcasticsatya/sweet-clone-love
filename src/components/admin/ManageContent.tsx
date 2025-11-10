import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Upload } from "lucide-react";
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
      const { error: insertError } = await supabase
        .from("chapters")
        .insert({
          subject_id: selectedSubjectId,
          chapter_number: parseInt(chapterNumber),
          name: chapterName,
          name_kannada: chapterNameKannada,
          pdf_url: publicUrl,
          pdf_storage_path: fileName
        });

      if (insertError) throw insertError;

      toast.success("Chapter uploaded successfully. PDF content extraction will happen soon.");
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
              <AccordionTrigger>
                {subject.name_kannada} ({subject.name})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-4">
                  {chapters[subject.id]?.length ? (
                    chapters[subject.id].map((chapter) => (
                      <div key={chapter.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">
                          Chapter {chapter.chapter_number}: {chapter.name_kannada}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chapter.content_extracted ? "✓ Processed" : "⏳ Pending"}
                        </span>
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
