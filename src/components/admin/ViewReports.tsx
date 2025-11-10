import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart } from "lucide-react";

export const ViewReports = () => {
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    const { data } = await supabase
      .from("quiz_attempts")
      .select(`
        *,
        profiles!student_id(*),
        quizzes(*, chapters(*, subjects(*)))
      `)
      .order("attempted_at", { ascending: false });
    
    setAttempts(data || []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Quiz Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Subject/Chapter</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>{attempt.profiles?.full_name}</TableCell>
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
                  <span className={`font-medium ${
                    (attempt.score / attempt.total_questions) >= 0.7 
                      ? "text-green-600" 
                      : (attempt.score / attempt.total_questions) >= 0.5
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}>
                    {Math.round((attempt.score / attempt.total_questions) * 100)}%
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(attempt.attempted_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
