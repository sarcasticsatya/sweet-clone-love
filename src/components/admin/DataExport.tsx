import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Users, BookOpen, FileText, Brain, Loader2, Archive } from "lucide-react";
import JSZip from "jszip";
import { naturalSortChapters } from "@/lib/naturalSort";

export const DataExport = () => {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (startedAt: string | null | undefined, attemptedAt: string): string => {
    if (!startedAt) return "N/A";
    
    const start = new Date(startedAt).getTime();
    const end = new Date(attemptedAt).getTime();
    const durationMs = end - start;
    
    if (durationMs < 0) return "N/A";
    
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0) {
      return `${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const exportStudents = async () => {
    setExporting("students");
    try {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const headers = [
        "NythicAI Platform - Student Data Export",
        "",
        "First Name,Surname,Personal Email,Parent Email,Parent Mobile,Date of Birth,City,School Name,Medium,Email Verified,Account Verified,Created At",
      ];

      const rows = (data || []).map((s) =>
        [
          s.first_name,
          s.surname,
          s.personal_email,
          s.parent_email,
          s.parent_mobile,
          s.date_of_birth,
          s.city,
          s.school_name,
          s.medium,
          s.email_verified ? "Yes" : "No",
          s.is_verified ? "Yes" : "No",
          formatDate(s.created_at),
        ].join(",")
      );

      downloadCSV([...headers, ...rows].join("\n"), `nythic-students-${Date.now()}.csv`);
      toast.success("Students exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export students");
    } finally {
      setExporting(null);
    }
  };

  const exportSubjectsAndChapters = async () => {
    setExporting("subjects");
    try {
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (subjectsError) throw subjectsError;

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("*");

      if (chaptersError) throw chaptersError;
      
      // Apply natural sort client-side for proper alphanumeric ordering
      const chapters = (chaptersData || []).sort(naturalSortChapters);

      const headers = [
        "NythicAI Platform - Subjects & Chapters Export",
        "",
        "Subject Name,Subject Name (Kannada),Chapter Number,Chapter Name,Chapter Name (Kannada),PDF URL",
      ];

      const rows: string[] = [];
      (subjects || []).forEach((subject) => {
        const subjectChapters = (chapters || []).filter((c) => c.subject_id === subject.id);
        if (subjectChapters.length === 0) {
          rows.push([subject.name, subject.name_kannada, "", "", "", ""].join(","));
        } else {
          subjectChapters.forEach((chapter) => {
            rows.push(
              [
                subject.name,
                subject.name_kannada,
                chapter.chapter_number,
                chapter.name,
                chapter.name_kannada,
                chapter.pdf_url,
              ].join(",")
            );
          });
        }
      });

      downloadCSV([...headers, ...rows].join("\n"), `nythic-subjects-chapters-${Date.now()}.csv`);
      toast.success("Subjects & Chapters exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export subjects & chapters");
    } finally {
      setExporting(null);
    }
  };

  const exportQuizReports = async () => {
    setExporting("quizzes");
    try {
      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select(`
          *,
          quizzes (
            title,
            chapters (
              name,
              subjects (name)
            )
          )
        `)
        .order("attempted_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("student_profiles")
        .select("user_id, first_name, surname");

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, `${p.first_name} ${p.surname}`])
      );

      const headers = [
        "NythicAI Platform - Quiz Reports Export",
        "",
        "Student Name,Subject,Chapter,Quiz Title,Score,Total Questions,Percentage,Duration,Date & Time",
      ];

      const rows = (attempts || []).map((a: any) => {
        const quiz = a.quizzes as any;
        return [
          profileMap.get(a.student_id) || "Unknown Student",
          quiz?.chapters?.subjects?.name || "N/A",
          quiz?.chapters?.name || "N/A",
          quiz?.title || "N/A",
          a.score,
          a.total_questions,
          `${Math.round((a.score / a.total_questions) * 100)}%`,
          formatDuration(a.started_at, a.attempted_at),
          `"${formatDateTime(a.attempted_at)}"`,
        ].join(",");
      });

      downloadCSV([...headers, ...rows].join("\n"), `nythic-quiz-reports-${Date.now()}.csv`);
      toast.success("Quiz reports exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export quiz reports");
    } finally {
      setExporting(null);
    }
  };

  const exportFlashcards = async () => {
    setExporting("flashcards");
    try {
      const { data: flashcards, error: flashcardsError } = await supabase
        .from("flashcards")
        .select(`
          *,
          chapters (
            name,
            subjects (name)
          )
        `)
        .order("created_at", { ascending: false });

      if (flashcardsError) throw flashcardsError;

      const headers = [
        "NythicAI Platform - Flashcards Export",
        "",
        "Subject,Chapter,Question,Answer,Created At",
      ];

      const rows = (flashcards || []).map((f) => {
        const chapter = f.chapters as any;
        return [
          `"${chapter?.subjects?.name || "N/A"}"`,
          `"${chapter?.name || "N/A"}"`,
          `"${(f.question || "").replace(/"/g, '""')}"`,
          `"${(f.answer || "").replace(/"/g, '""')}"`,
          formatDate(f.created_at),
        ].join(",");
      });

      downloadCSV([...headers, ...rows].join("\n"), `nythic-flashcards-${Date.now()}.csv`);
      toast.success("Flashcards exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export flashcards");
    } finally {
      setExporting(null);
    }
  };

  const exportAllData = async () => {
    setExporting("all");
    try {
      const zip = new JSZip();
      const timestamp = Date.now();

      // Fetch all data in parallel
      const [studentsRes, subjectsRes, chaptersDataRes, attemptsRes, flashcardsRes, profilesRes] =
        await Promise.all([
          supabase.from("student_profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("subjects").select("*").order("name"),
          supabase.from("chapters").select("*"),
          supabase.from("quiz_attempts").select(`*, quizzes (title, chapters (name, subjects (name)))`).order("attempted_at", { ascending: false }),
          supabase.from("flashcards").select(`*, chapters (name, subjects (name))`).order("created_at", { ascending: false }),
          supabase.from("student_profiles").select("user_id, first_name, surname"),
        ]);

      // Students CSV
      const studentsCSV = [
        "NythicAI Platform - Student Data Export",
        "",
        "First Name,Surname,Personal Email,Parent Email,Parent Mobile,Date of Birth,City,School Name,Medium,Email Verified,Account Verified,Created At",
        ...(studentsRes.data || []).map((s) =>
          [s.first_name, s.surname, s.personal_email, s.parent_email, s.parent_mobile, s.date_of_birth, s.city, s.school_name, s.medium, s.email_verified ? "Yes" : "No", s.is_verified ? "Yes" : "No", formatDate(s.created_at)].join(",")
        ),
      ].join("\n");
      zip.file("students.csv", studentsCSV);

      // Subjects & Chapters CSV - apply natural sort
      const sortedChapters = (chaptersDataRes.data || []).sort(naturalSortChapters);
      const subjectsRows: string[] = [];
      (subjectsRes.data || []).forEach((subject) => {
        const subjectChapters = sortedChapters.filter((c) => c.subject_id === subject.id);
        if (subjectChapters.length === 0) {
          subjectsRows.push([subject.name, subject.name_kannada, "", "", "", ""].join(","));
        } else {
          subjectChapters.forEach((chapter) => {
            subjectsRows.push([subject.name, subject.name_kannada, chapter.chapter_number, chapter.name, chapter.name_kannada, chapter.pdf_url].join(","));
          });
        }
      });
      const subjectsCSV = [
        "NythicAI Platform - Subjects & Chapters Export",
        "",
        "Subject Name,Subject Name (Kannada),Chapter Number,Chapter Name,Chapter Name (Kannada),PDF URL",
        ...subjectsRows,
      ].join("\n");
      zip.file("subjects-chapters.csv", subjectsCSV);

      // Quiz Reports CSV
      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, `${p.first_name} ${p.surname}`]));
      const quizCSV = [
        "NythicAI Platform - Quiz Reports Export",
        "",
        "Student Name,Subject,Chapter,Quiz Title,Score,Total Questions,Percentage,Duration,Date & Time",
        ...(attemptsRes.data || []).map((a: any) => {
          const quiz = a.quizzes as any;
          return [profileMap.get(a.student_id) || "Unknown", quiz?.chapters?.subjects?.name || "N/A", quiz?.chapters?.name || "N/A", quiz?.title || "N/A", a.score, a.total_questions, `${Math.round((a.score / a.total_questions) * 100)}%`, formatDuration(a.started_at, a.attempted_at), `"${formatDateTime(a.attempted_at)}"`].join(",");
        }),
      ].join("\n");
      zip.file("quiz-reports.csv", quizCSV);

      // Flashcards CSV
      const flashcardsCSV = [
        "NythicAI Platform - Flashcards Export",
        "",
        "Subject,Chapter,Question,Answer,Created At",
        ...(flashcardsRes.data || []).map((f) => {
          const chapter = f.chapters as any;
          return [`"${chapter?.subjects?.name || "N/A"}"`, `"${chapter?.name || "N/A"}"`, `"${(f.question || "").replace(/"/g, '""')}"`, `"${(f.answer || "").replace(/"/g, '""')}"`, formatDate(f.created_at)].join(",");
        }),
      ].join("\n");
      zip.file("flashcards.csv", flashcardsCSV);

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `nythic-ai-data-export-${timestamp}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success("All data exported successfully as ZIP");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export all data");
    } finally {
      setExporting(null);
    }
  };

  const exportButtons = [
    { id: "students", label: "Export Students", icon: Users, onClick: exportStudents, description: "All student profiles with contact info" },
    { id: "subjects", label: "Export Subjects & Chapters", icon: BookOpen, onClick: exportSubjectsAndChapters, description: "Subjects with their chapters and PDF links" },
    { id: "quizzes", label: "Export Quiz Reports", icon: FileText, onClick: exportQuizReports, description: "All quiz attempts with scores and dates" },
    { id: "flashcards", label: "Export Flashcards", icon: Brain, onClick: exportFlashcards, description: "All generated flashcards per chapter" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Export All Data
          </CardTitle>
          <CardDescription>
            Download a complete backup of all platform data as a ZIP file containing multiple CSV files.
            All exports are branded with "NythicAI Platform" headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={exportAllData}
            disabled={exporting !== null}
            className="w-full sm:w-auto"
            size="lg"
          >
            {exporting === "all" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting All Data...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export All Data (ZIP)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {exportButtons.map((btn) => (
          <Card key={btn.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <btn.icon className="h-4 w-4" />
                {btn.label}
              </CardTitle>
              <CardDescription className="text-sm">{btn.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={btn.onClick}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === btn.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
