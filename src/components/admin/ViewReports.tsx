import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Trophy, Users, TrendingUp, Download, Mail, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  attempted_at: string;
  profiles?: { full_name: string };
  quizzes?: {
    title: string;
    chapters?: {
      name_kannada: string;
      subjects?: { name_kannada: string };
    };
  };
  student_id: string;
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attemptsRes, profilesRes, subjectsRes] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select(`
            *,
            quizzes(title, chapters(name_kannada, subjects(name_kannada)))
          `)
          .order("attempted_at", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("subjects").select("*")
      ]);
      
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      
      const attemptsWithProfiles = (attemptsRes.data || []).map(attempt => ({
        ...attempt,
        profiles: profilesMap.get(attempt.student_id) || { full_name: "Unknown" }
      })) as QuizAttempt[];
      
      setAttempts(attemptsWithProfiles);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

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
    return matchesSearch && matchesSubject;
  });

  const exportToCSV = () => {
    const csvContent = [
      ["Student", "Subject", "Chapter", "Score", "Percentage", "Date"].join(","),
      ...filteredAttempts.map(a => [
        `"${a.profiles?.full_name || 'Unknown'}"`,
        `"${a.quizzes?.chapters?.subjects?.name_kannada || ''}"`,
        `"${a.quizzes?.chapters?.name_kannada || ''}"`,
        `${a.score}/${a.total_questions}`,
        `${Math.round((a.score / a.total_questions) * 100)}%`,
        new Date(a.attempted_at).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quiz_reports_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Report exported successfully!");
  };

  const sendEmailReport = async (studentId: string) => {
    setExporting(true);
    try {
      // This would integrate with Resend API
      toast.info("Email functionality requires Resend API setup. Export CSV and share manually for now.");
    } catch (error) {
      toast.error("Failed to send email");
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
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.name_kannada}>{s.name_kannada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject/Chapter</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No quiz attempts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
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
                        {new Date(attempt.attempted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => sendEmailReport(attempt.student_id)}
                          disabled={exporting}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
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
