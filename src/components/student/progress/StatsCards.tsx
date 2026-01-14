import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Target, Clock, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  totalQuizzes: number;
  averageScore: number;
  totalStudyMinutes: number;
  subjectsStudied: number;
}

export function StatsCards({
  totalQuizzes,
  averageScore,
  totalStudyMinutes,
  subjectsStudied,
}: StatsCardsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const stats = [
    {
      label: "Quizzes Taken",
      value: totalQuizzes,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Avg. Score",
      value: `${Math.round(averageScore)}%`,
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Study Time",
      value: formatTime(totalStudyMinutes),
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Subjects",
      value: subjectsStudied,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
