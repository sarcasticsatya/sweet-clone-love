import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Trophy, Users, TrendingUp, Download, Search, Loader2, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerIndicFont, getFontForText, containsIndicScript } from "@/lib/pdfFonts";
import JSZip from "jszip";

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  attempted_at: string;
  profiles?: { full_name: string };
  quizzes?: {
    title: string;
    chapters?: {
      name: string;
      name_kannada: string;
      subjects?: { name: string; name_kannada: string };
    };
  };
  student_id: string;
}

interface StudentProfile {
  user_id: string;
  first_name: string;
  surname: string;
  medium: string;
  school_name: string;
  city: string;
  personal_email: string;
  parent_email: string;
}

interface StudentStats {
  student_id: string;
  student_name: string;
  total_quizzes: number;
  average_score: number;
  total_score: number;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

export const ViewReports = () => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [downloadingBulkPDF, setDownloadingBulkPDF] = useState(false);
  
  // Student profiles for filtering
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  
  // Selection and date filtering
  const [selectedAttempts, setSelectedAttempts] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Commented out email-related state
  // const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  // const [sendingBulkEmail, setSendingBulkEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attemptsRes, profilesRes, subjectsRes, studentProfilesRes] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select(`
            *,
            quizzes(title, chapters(name, name_kannada, subjects(name, name_kannada)))
          `)
          .order("attempted_at", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("subjects").select("*"),
        supabase.from("student_profiles").select("user_id, first_name, surname, medium, school_name, city, personal_email, parent_email")
      ]);
      
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      
      const attemptsWithProfiles = (attemptsRes.data || []).map(attempt => ({
        ...attempt,
        profiles: profilesMap.get(attempt.student_id) || { full_name: "Unknown" }
      })) as QuizAttempt[];
      
      setAttempts(attemptsWithProfiles);
      setSubjects(subjectsRes.data || []);
      
      // Store student profiles for filtering
      const profiles = (studentProfilesRes.data || []) as StudentProfile[];
      setStudentProfiles(profiles);
      
      // Extract unique school names
      const uniqueSchools = [...new Set(profiles.map(p => p.school_name).filter(Boolean))].sort();
      setSchools(uniqueSchools);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create a map for quick lookup of student profiles
  const studentProfilesMap = new Map(studentProfiles.map(p => [p.user_id, p]));

  // Calculate leaderboard
  const leaderboard: StudentStats[] = attempts.reduce((acc: StudentStats[], attempt) => {
    const existing = acc.find(s => s.student_id === attempt.student_id);
    const percentage = (attempt.score / attempt.total_questions) * 100;
    
    if (existing) {
      existing.total_quizzes++;
      existing.total_score += percentage;
      existing.average_score = existing.total_score / existing.total_quizzes;
    } else {
      acc.push({
        student_id: attempt.student_id,
        student_name: attempt.profiles?.full_name || "Unknown",
        total_quizzes: 1,
        average_score: percentage,
        total_score: percentage
      });
    }
    return acc;
  }, []).sort((a, b) => b.average_score - a.average_score);

  // Performance distribution data
  const performanceDistribution = [
    { name: "Excellent (70%+)", value: attempts.filter(a => (a.score / a.total_questions) >= 0.7).length, color: "#22c55e" },
    { name: "Good (50-69%)", value: attempts.filter(a => (a.score / a.total_questions) >= 0.5 && (a.score / a.total_questions) < 0.7).length, color: "#eab308" },
    { name: "Needs Work (<50%)", value: attempts.filter(a => (a.score / a.total_questions) < 0.5).length, color: "#ef4444" },
  ];

  // Weekly trend data
  const weeklyData = attempts.reduce((acc: any[], attempt) => {
    const date = new Date(attempt.attempted_at).toLocaleDateString('en-US', { weekday: 'short' });
    const existing = acc.find(d => d.day === date);
    if (existing) {
      existing.quizzes++;
      existing.avgScore = ((existing.avgScore * (existing.quizzes - 1)) + (attempt.score / attempt.total_questions) * 100) / existing.quizzes;
    } else {
      acc.push({ day: date, quizzes: 1, avgScore: (attempt.score / attempt.total_questions) * 100 });
    }
    return acc;
  }, []).slice(-7);

  // Filter attempts
  const filteredAttempts = attempts.filter(attempt => {
    const matchesSearch = attempt.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          attempt.quizzes?.chapters?.name_kannada?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === "all" || 
                           attempt.quizzes?.chapters?.subjects?.name_kannada === filterSubject;
    
    // Medium filtering
    const studentProfile = studentProfilesMap.get(attempt.student_id);
    const matchesMedium = filterMedium === "all" || studentProfile?.medium === filterMedium;
    
    // School filtering
    const matchesSchool = filterSchool === "all" || studentProfile?.school_name === filterSchool;
    
    // Date filtering
    const attemptDate = new Date(attempt.attempted_at);
    const matchesStartDate = !startDate || attemptDate >= new Date(startDate);
    const matchesEndDate = !endDate || attemptDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesSubject && matchesMedium && matchesSchool && matchesStartDate && matchesEndDate;
  });

  // Check if all filtered attempts are selected
  const allSelected = filteredAttempts.length > 0 && filteredAttempts.every(a => selectedAttempts.has(a.id));

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttempts(new Set(filteredAttempts.map(a => a.id)));
    } else {
      setSelectedAttempts(new Set());
    }
  };

  // Handle individual selection
  const handleSelectOne = (attemptId: string, checked: boolean) => {
    const newSet = new Set(selectedAttempts);
    if (checked) {
      newSet.add(attemptId);
    } else {
      newSet.delete(attemptId);
    }
    setSelectedAttempts(newSet);
  };

  // Commented out: Bulk email function
  /*
  const sendBulkEmails = async () => {
    const selected = filteredAttempts.filter(a => selectedAttempts.has(a.id));
    if (selected.length === 0) {
      toast.error("No reports selected");
      return;
    }
    setSendingBulkEmail(true);
    // ... rest of bulk email logic
    setSendingBulkEmail(false);
    setSelectedAttempts(new Set());
  };
  */

  // Generate single PDF for an attempt (reused for bulk download)
  const generatePDFForAttempt = async (attempt: QuizAttempt): Promise<{ pdf: jsPDF; fileName: string }> => {
    const studentProfile = studentProfilesMap.get(attempt.student_id);
    
    const studentRank = leaderboard.findIndex(s => s.student_id === attempt.student_id) + 1;
    const totalStudents = leaderboard.length;
    const percentile = totalStudents > 1 
      ? Math.round(((totalStudents - studentRank) / (totalStudents - 1)) * 100) 
      : 100;
    const classAverage = leaderboard.length > 0 
      ? Math.round(leaderboard.reduce((sum, s) => sum + s.average_score, 0) / leaderboard.length)
      : 0;
    
    const studentPercentage = Math.round((attempt.score / attempt.total_questions) * 100);
    const performanceVsAverage = studentPercentage - classAverage;
    const performanceText = performanceVsAverage >= 0 
      ? `+${performanceVsAverage}% above average` 
      : `${performanceVsAverage}% below average`;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const indicFontLoaded = await registerIndicFont(doc);

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Quiz Performance Report", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Nythic AI Edtech", pageWidth / 2, 28, { align: "center" });

    doc.setTextColor(0, 0, 0);

    // Student Info Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Student Information", 14, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const studentName = studentProfile 
      ? `${studentProfile.first_name} ${studentProfile.surname}` 
      : attempt.profiles?.full_name || "Unknown";
    
    doc.text(`Name: ${studentName}`, 14, 60);
    doc.text(`School: ${studentProfile?.school_name || "N/A"}`, 14, 68);
    doc.text(`City: ${studentProfile?.city || "N/A"}`, 14, 76);
    doc.text(`Date & Time: ${new Date(attempt.attempted_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`, 14, 84);

    // Quiz Info Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Quiz Details", 14, 100);
    doc.setFontSize(11);
    
    const subjectName = indicFontLoaded 
      ? (attempt.quizzes?.chapters?.subjects?.name_kannada || attempt.quizzes?.chapters?.subjects?.name || "N/A")
      : (attempt.quizzes?.chapters?.subjects?.name || "N/A");
    const chapterName = indicFontLoaded 
      ? (attempt.quizzes?.chapters?.name_kannada || attempt.quizzes?.chapters?.name || "N/A")
      : (attempt.quizzes?.chapters?.name || "N/A");
    
    doc.setFont(getFontForText(subjectName, indicFontLoaded), "normal");
    doc.text(`Subject: ${subjectName}`, 14, 110);
    
    doc.setFont(getFontForText(chapterName, indicFontLoaded), "normal");
    doc.text(`Chapter: ${chapterName}`, 14, 118);

    // Score Section
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 128, pageWidth - 28, 35, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Score", 20, 140);
    doc.setFontSize(24);
    doc.setTextColor(studentPercentage >= 70 ? 34 : studentPercentage >= 50 ? 234 : 239, 
                     studentPercentage >= 70 ? 197 : studentPercentage >= 50 ? 179 : 68, 
                     studentPercentage >= 70 ? 94 : studentPercentage >= 50 ? 8 : 68);
    doc.text(`${attempt.score}/${attempt.total_questions} (${studentPercentage}%)`, 20, 155);

    doc.setTextColor(0, 0, 0);

    // Competitive Analysis Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Competitive Analysis", 14, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const analysisData = [
      ["Rank", `${studentRank} of ${totalStudents} students`],
      ["Percentile", `Top ${percentile}%`],
      ["Class Average", `${classAverage}%`],
      ["Performance", performanceText]
    ];

    autoTable(doc, {
      startY: 185,
      head: [],
      body: analysisData,
      theme: 'plain',
      styles: { cellPadding: 3, fontSize: 11 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // Performance Assessment
    const assessmentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(studentPercentage >= 70 ? 220 : studentPercentage >= 50 ? 254 : 254, 
                     studentPercentage >= 70 ? 252 : studentPercentage >= 50 ? 249 : 226, 
                     studentPercentage >= 70 ? 231 : studentPercentage >= 50 ? 195 : 226);
    doc.roundedRect(14, assessmentY, pageWidth - 28, 25, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const assessmentText = studentPercentage >= 70 
      ? "Excellent work! Keep it up!" 
      : studentPercentage >= 50 
        ? "Good effort! Room for improvement." 
        : "Keep practicing! You can do better!";
    doc.text(assessmentText, pageWidth / 2, assessmentY + 15, { align: "center" });

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')} | Powered by Nythic AI Edtech`, pageWidth / 2, 285, { align: "center" });

    const fileName = `Quiz_Report_${studentName.replace(/\s+/g, '_')}_${new Date(attempt.attempted_at).toISOString().split('T')[0]}.pdf`;
    
    return { pdf: doc, fileName };
  };

  // Bulk PDF download function
  const downloadBulkPDFs = async () => {
    const selected = filteredAttempts.filter(a => selectedAttempts.has(a.id));
    if (selected.length === 0) {
      toast.error("No reports selected");
      return;
    }

    setDownloadingBulkPDF(true);
    try {
      const zip = new JSZip();
      
      for (const attempt of selected) {
        try {
          const { pdf, fileName } = await generatePDFForAttempt(attempt);
          const pdfBlob = pdf.output('blob');
          zip.file(fileName, pdfBlob);
        } catch (error) {
          console.error("Error generating PDF for attempt:", attempt.id, error);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      
      // Generate filename based on filters
      const filterParts = [];
      if (filterMedium !== "all") filterParts.push(filterMedium);
      if (filterSchool !== "all") filterParts.push(filterSchool.replace(/\s+/g, '_'));
      const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';
      
      link.download = `Quiz_Reports${filterSuffix}_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      
      toast.success(`Downloaded ${selected.length} reports`);
      setSelectedAttempts(new Set());
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to download reports");
    } finally {
      setDownloadingBulkPDF(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Student", "Subject", "Chapter", "Score", "Percentage", "Date & Time"].join(","),
      ...filteredAttempts.map(a => [
        `"${a.profiles?.full_name || 'Unknown'}"`,
        `"${a.quizzes?.chapters?.subjects?.name_kannada || ''}"`,
        `"${a.quizzes?.chapters?.name_kannada || ''}"`,
        `${a.score}/${a.total_questions}`,
        `${Math.round((a.score / a.total_questions) * 100)}%`,
        `"${new Date(a.attempted_at).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quiz_reports_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Report exported successfully!");
  };

  const downloadStudentPDF = async (attempt: QuizAttempt) => {
    setGeneratingPDF(attempt.id);
    try {
      const { pdf, fileName } = await generatePDFForAttempt(attempt);
      pdf.save(fileName);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setGeneratingPDF(null);
    }
  };

  // Commented out: Email individual PDF function
  /*
  const emailStudentPDF = async (attempt: QuizAttempt) => {
    setSendingEmail(attempt.id);
    try {
      // ... email logic
    } catch (error) {
      console.error("Error emailing PDF:", error);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(null);
    }
  };
  */

  const downloadGlobalReport = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      const indicFontLoaded = await registerIndicFont(doc);

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Competitive Analysis Report", pageWidth / 2, 18, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Nythic AI Edtech", pageWidth / 2, 28, { align: "center" });

      doc.setTextColor(0, 0, 0);

      // Filter info
      doc.setFontSize(10);
      const filterInfo = [];
      if (filterMedium !== "all") filterInfo.push(`Medium: ${filterMedium}`);
      if (filterSchool !== "all") filterInfo.push(`School: ${filterSchool}`);
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(" | ")}`, 14, 42);
      }

      // Summary Statistics
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics", 14, filterInfo.length > 0 ? 55 : 50);

      const avgScore = filteredAttempts.length > 0 
        ? Math.round(filteredAttempts.reduce((sum, a) => sum + (a.score / a.total_questions) * 100, 0) / filteredAttempts.length)
        : 0;
      const passRate = filteredAttempts.length > 0 
        ? Math.round((filteredAttempts.filter(a => (a.score / a.total_questions) >= 0.5).length / filteredAttempts.length) * 100)
        : 0;

      // Calculate filtered leaderboard
      const filteredStudentIds = new Set(filteredAttempts.map(a => a.student_id));
      const filteredLeaderboard = leaderboard.filter(s => filteredStudentIds.has(s.student_id));

      const summaryData = [
        ["Total Students", filteredLeaderboard.length.toString()],
        ["Total Quiz Attempts", filteredAttempts.length.toString()],
        ["Average Score", `${avgScore}%`],
        ["Pass Rate (>=50%)", `${passRate}%`]
      ];

      autoTable(doc, {
        startY: filterInfo.length > 0 ? 60 : 55,
        head: [],
        body: summaryData,
        theme: 'grid',
        styles: { cellPadding: 4, fontSize: 11 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
      });

      // Performance Distribution
      const distY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Distribution", 14, distY);

      const filteredPerfDist = [
        { name: "Excellent (70%+)", value: filteredAttempts.filter(a => (a.score / a.total_questions) >= 0.7).length },
        { name: "Good (50-69%)", value: filteredAttempts.filter(a => (a.score / a.total_questions) >= 0.5 && (a.score / a.total_questions) < 0.7).length },
        { name: "Needs Work (<50%)", value: filteredAttempts.filter(a => (a.score / a.total_questions) < 0.5).length },
      ];

      const distData = filteredPerfDist.map(p => [p.name, p.value.toString(), `${filteredAttempts.length > 0 ? Math.round((p.value / filteredAttempts.length) * 100) : 0}%`]);

      autoTable(doc, {
        startY: distY + 5,
        head: [["Category", "Count", "Percentage"]],
        body: distData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { cellPadding: 3, fontSize: 10 }
      });

      // Leaderboard
      const leaderY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Student Leaderboard", 14, leaderY);

      const leaderData = filteredLeaderboard.map((s, idx) => [
        (idx + 1).toString(),
        s.student_name,
        s.total_quizzes.toString(),
        `${Math.round(s.average_score)}%`
      ]);

      autoTable(doc, {
        startY: leaderY + 5,
        head: [["Rank", "Student Name", "Quizzes", "Avg Score"]],
        body: leaderData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { cellPadding: 3, fontSize: 9 }
      });

      // Subject-wise Performance (new page)
      doc.addPage();
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Subject-wise Performance", pageWidth / 2, 16, { align: "center" });

      doc.setTextColor(0, 0, 0);

      const subjectStats = filteredAttempts.reduce((acc: any, attempt) => {
        const subject = indicFontLoaded 
          ? (attempt.quizzes?.chapters?.subjects?.name_kannada || attempt.quizzes?.chapters?.subjects?.name || "Unknown")
          : (attempt.quizzes?.chapters?.subjects?.name || "Unknown");
        if (!acc[subject]) {
          acc[subject] = { attempts: 0, totalScore: 0 };
        }
        acc[subject].attempts++;
        acc[subject].totalScore += (attempt.score / attempt.total_questions) * 100;
        return acc;
      }, {});

      const subjectData = Object.entries(subjectStats).map(([subject, stats]: [string, any]) => [
        subject,
        stats.attempts.toString(),
        `${Math.round(stats.totalScore / stats.attempts)}%`
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["Subject", "Attempts", "Avg Score"]],
        body: subjectData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { cellPadding: 4, fontSize: 10 },
        didParseCell: (data) => {
          if (indicFontLoaded && data.column.index === 0 && data.cell.raw && containsIndicScript(String(data.cell.raw))) {
            data.cell.styles.font = "NotoSansKannada";
          }
        }
      });

      // Detailed Quiz History
      const historyY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Quiz History", 14, historyY);

      const historyData = filteredAttempts.slice(0, 50).map(a => [
        a.profiles?.full_name || "Unknown",
        indicFontLoaded 
          ? (a.quizzes?.chapters?.subjects?.name_kannada || a.quizzes?.chapters?.subjects?.name || "N/A")
          : (a.quizzes?.chapters?.subjects?.name || "N/A"),
        indicFontLoaded 
          ? (a.quizzes?.chapters?.name_kannada || a.quizzes?.chapters?.name || "N/A")
          : (a.quizzes?.chapters?.name || "N/A"),
        `${a.score}/${a.total_questions}`,
        `${Math.round((a.score / a.total_questions) * 100)}%`,
        new Date(a.attempted_at).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      ]);

      autoTable(doc, {
        startY: historyY + 5,
        head: [["Student", "Subject", "Chapter", "Score", "%", "Date & Time"]],
        body: historyData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { cellPadding: 2, fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15 },
          5: { cellWidth: 25 }
        },
        didParseCell: (data) => {
          if (indicFontLoaded && (data.column.index === 1 || data.column.index === 2) && data.cell.raw && containsIndicScript(String(data.cell.raw))) {
            data.cell.styles.font = "NotoSansKannada";
          }
        }
      });

      // Footer on last page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString('en-IN')} | Nythic AI Edtech`, pageWidth / 2, 290, { align: "center" });
      }

      // Generate filename based on filters
      const filterParts = [];
      if (filterMedium !== "all") filterParts.push(filterMedium);
      if (filterSchool !== "all") filterParts.push(filterSchool.replace(/\s+/g, '_'));
      const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';

      const fileName = `Global_Report${filterSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success("Global report downloaded!");
    } catch (error) {
      console.error("Error generating global report:", error);
      toast.error("Failed to generate global report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{leaderboard.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BarChart className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
                <p className="text-2xl font-bold">{attempts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {attempts.length > 0 
                    ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.total_questions) * 100, 0) / attempts.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">
                  {attempts.length > 0 
                    ? Math.round((attempts.filter(a => (a.score / a.total_questions) >= 0.5).length / attempts.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceDistribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((student, idx) => (
                <div key={student.student_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? "bg-yellow-500 text-white" :
                    idx === 1 ? "bg-gray-400 text-white" :
                    idx === 2 ? "bg-amber-600 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{student.student_name}</p>
                    <p className="text-xs text-muted-foreground">{student.total_quizzes} quizzes</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${
                      student.average_score >= 70 ? "text-green-600" :
                      student.average_score >= 50 ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {Math.round(student.average_score)}%
                    </p>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No quiz attempts yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Results Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Quiz Reports
              </CardTitle>
              <CardDescription>Detailed quiz attempt history</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              <Select value={filterMedium} onValueChange={setFilterMedium}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Medium</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Kannada">Kannada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSchool} onValueChange={setFilterSchool}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.name_kannada}>{s.name_kannada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[130px]"
                  placeholder="From"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[130px]"
                  placeholder="To"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadGlobalReport} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                PDF
              </Button>
              {selectedAttempts.size > 0 && (
                <Button 
                  size="sm" 
                  onClick={downloadBulkPDFs} 
                  disabled={downloadingBulkPDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {downloadingBulkPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download ({selectedAttempts.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject/Chapter</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No quiz attempts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedAttempts.has(attempt.id)}
                          onCheckedChange={(checked) => handleSelectOne(attempt.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{attempt.profiles?.full_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {attempt.quizzes?.chapters?.subjects?.name_kannada}
                          </div>
                          <div className="text-muted-foreground">
                            {attempt.quizzes?.chapters?.name_kannada}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {attempt.score} / {attempt.total_questions}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium px-2 py-1 rounded text-xs ${
                          (attempt.score / attempt.total_questions) >= 0.7 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                            : (attempt.score / attempt.total_questions) >= 0.5
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {Math.round((attempt.score / attempt.total_questions) * 100)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(attempt.attempted_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadStudentPDF(attempt)}
                          disabled={generatingPDF === attempt.id}
                          title="Download PDF Report"
                        >
                          {generatingPDF === attempt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        {/* Commented out: Email button
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => emailStudentPDF(attempt)}
                          disabled={sendingEmail === attempt.id}
                          title="Email PDF Report"
                        >
                          {sendingEmail === attempt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </Button>
                        */}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
