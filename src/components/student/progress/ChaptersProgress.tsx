import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SubjectProgress {
  subjectName: string;
  completedChapters: number;
  totalChapters: number;
}

interface ChaptersProgressProps {
  data: SubjectProgress[];
}

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-cyan-500",
];

export function ChaptersProgress({ data }: ChaptersProgressProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chapters Completed</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No subjects assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Chapters Completed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((subject, index) => {
          const percentage = subject.totalChapters > 0 
            ? Math.round((subject.completedChapters / subject.totalChapters) * 100) 
            : 0;
          
          return (
            <div key={subject.subjectName} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium truncate">{subject.subjectName}</span>
                <span className="text-muted-foreground">
                  {subject.completedChapters}/{subject.totalChapters}
                </span>
              </div>
              <div className="relative">
                <Progress value={percentage} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full ${COLORS[index % COLORS.length]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
