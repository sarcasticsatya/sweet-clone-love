import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatsCards } from "@/components/student/progress/StatsCards";
import { QuizScoreChart } from "@/components/student/progress/QuizScoreChart";
import { TimeSpentChart } from "@/components/student/progress/TimeSpentChart";
import { ChaptersProgress } from "@/components/student/progress/ChaptersProgress";
import { ActivityCalendar } from "@/components/student/progress/ActivityCalendar";
import { subDays, startOfDay, isSameDay } from "date-fns";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";

type TimePeriod = "week" | "month" | "all";

interface QuizAttempt {
  date: string;
  score: number;
  subjectName: string;
}

interface SubjectTime {
  subjectName: string;
  minutes: number;
}

interface SubjectProgress {
  subjectName: string;
  completedChapters: number;
  totalChapters: number;
}

interface ActivityDay {
  date: Date;
  activityMinutes: number;
}

const StudentProgress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("month");
  
  // Stats
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);
  const [subjectsStudied, setSubjectsStudied] = useState(0);
  
  // Chart data
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [timePerSubject, setTimePerSubject] = useState<SubjectTime[]>([]);
  const [chaptersProgress, setChaptersProgress] = useState<SubjectProgress[]>([]);
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);

  const handleInactivityLogout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("session_id");
    navigate("/auth");
  }, [navigate]);

  const { showWarning, remainingSeconds, dismissWarning } = useInactivityLogout({
    timeoutMs: 30 * 60 * 1000,
    onLogout: handleInactivityLogout
  });

  const getDateFilter = (period: TimePeriod) => {
    const now = new Date();
    if (period === "week") return subDays(now, 7);
    if (period === "month") return subDays(now, 30);
    return new Date(0); // All time
  };

  const loadProgress = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const dateFilter = getDateFilter(period);

      // Fetch quiz attempts with subject info
      const { data: quizData } = await supabase
        .from("quiz_attempts")
        .select(`
          score,
          total_questions,
          attempted_at,
          quiz:quizzes!inner(
            chapter:chapters!inner(
              subject:subjects!inner(name)
            )
          )
        `)
        .eq("student_id", user.id)
        .gte("attempted_at", dateFilter.toISOString())
        .order("attempted_at", { ascending: true });

      if (quizData) {
        const attempts: QuizAttempt[] = quizData.map((q: any) => ({
          date: q.attempted_at,
          score: Math.round((q.score / q.total_questions) * 100),
          subjectName: q.quiz?.chapter?.subject?.name || "Unknown",
        }));
        setQuizAttempts(attempts);
        setTotalQuizzes(attempts.length);
        setAverageScore(
          attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
            : 0
        );
        setSubjectsStudied(new Set(attempts.map((a) => a.subjectName)).size);
      }

      // Fetch activity logs for time tracking
      const { data: activityData } = await supabase
        .from("student_activity_logs")
        .select(`
          duration_seconds,
          created_at,
          subject:subjects(name)
        `)
        .eq("student_id", user.id)
        .gte("created_at", dateFilter.toISOString());

      if (activityData) {
        // Calculate total study time
        const totalSeconds = activityData.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
        setTotalStudyMinutes(Math.floor(totalSeconds / 60));

        // Group by subject
        const subjectTimeMap = new Map<string, number>();
        activityData.forEach((a: any) => {
          const subjectName = a.subject?.name || "Other";
          const current = subjectTimeMap.get(subjectName) || 0;
          subjectTimeMap.set(subjectName, current + Math.floor((a.duration_seconds || 0) / 60));
        });
        
        setTimePerSubject(
          Array.from(subjectTimeMap.entries())
            .map(([subjectName, minutes]) => ({ subjectName, minutes }))
            .sort((a, b) => b.minutes - a.minutes)
        );

        // Calculate activity by day for calendar
        const dayMap = new Map<string, number>();
        activityData.forEach((a: any) => {
          const day = startOfDay(new Date(a.created_at)).toISOString();
          const current = dayMap.get(day) || 0;
          dayMap.set(day, current + Math.floor((a.duration_seconds || 0) / 60));
        });
        
        // Also include quiz attempts as activity
        quizData?.forEach((q: any) => {
          const day = startOfDay(new Date(q.attempted_at)).toISOString();
          const current = dayMap.get(day) || 0;
          dayMap.set(day, current + 10); // Assume 10 min per quiz
        });

        setActivityDays(
          Array.from(dayMap.entries()).map(([dateStr, minutes]) => ({
            date: new Date(dateStr),
            activityMinutes: minutes,
          }))
        );
      }

      // Fetch chapters progress
      const { data: accessData } = await supabase
        .from("student_subject_access")
        .select(`
          subject:subjects!inner(
            id,
            name,
            chapters(id)
          )
        `)
        .eq("student_id", user.id);

      if (accessData) {
        const progressPromises = accessData.map(async (access: any) => {
          const subject = access.subject;
          const chapterIds = subject.chapters.map((c: any) => c.id);
          
          // Get unique chapters with quiz attempts
          const { data: attemptedChapters } = await supabase
            .from("quiz_attempts")
            .select("quiz:quizzes!inner(chapter_id)")
            .eq("student_id", user.id)
            .in("quiz.chapter_id", chapterIds.length > 0 ? chapterIds : ['none']);

          const uniqueChapters = new Set(
            attemptedChapters?.map((a: any) => a.quiz?.chapter_id) || []
          );

          return {
            subjectName: subject.name,
            completedChapters: uniqueChapters.size,
            totalChapters: chapterIds.length,
          };
        });

        const progress = await Promise.all(progressPromises);
        setChaptersProgress(progress);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <InactivityWarningDialog
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={dismissWarning}
      />

      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Logo size="sm" />
              </div>
              <span className="font-semibold text-lg hidden sm:inline">My Progress</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="all">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <StatsCards
          totalQuizzes={totalQuizzes}
          averageScore={averageScore}
          totalStudyMinutes={totalStudyMinutes}
          subjectsStudied={subjectsStudied}
        />

        {/* Quiz Score Chart */}
        <QuizScoreChart attempts={quizAttempts} />

        {/* Two column layout */}
        <div className="grid md:grid-cols-2 gap-6">
          <TimeSpentChart data={timePerSubject} />
          <ChaptersProgress data={chaptersProgress} />
        </div>

        {/* Activity Calendar */}
        <ActivityCalendar activityDays={activityDays} />
      </main>
    </div>
  );
};

export default StudentProgress;
