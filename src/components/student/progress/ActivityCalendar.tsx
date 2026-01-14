import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfWeek, addDays, isSameDay } from "date-fns";

interface ActivityDay {
  date: Date;
  activityMinutes: number;
}

interface ActivityCalendarProps {
  activityDays: ActivityDay[];
}

export function ActivityCalendar({ activityDays }: ActivityCalendarProps) {
  const today = new Date();
  const startDate = subDays(today, 27); // Last 28 days (4 weeks)
  
  // Generate 4 weeks of days
  const weeks: Date[][] = [];
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });
  
  for (let w = 0; w < 4; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(currentWeekStart, d));
    }
    weeks.push(week);
    currentWeekStart = addDays(currentWeekStart, 7);
  }

  const getActivityLevel = (date: Date): number => {
    const activity = activityDays.find((a) => isSameDay(a.date, date));
    if (!activity || activity.activityMinutes === 0) return 0;
    if (activity.activityMinutes < 15) return 1;
    if (activity.activityMinutes < 30) return 2;
    if (activity.activityMinutes < 60) return 3;
    return 4;
  };

  const getActivityColor = (level: number): string => {
    switch (level) {
      case 0:
        return "bg-muted";
      case 1:
        return "bg-primary/20";
      case 2:
        return "bg-primary/40";
      case 3:
        return "bg-primary/70";
      case 4:
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate streak
  let streak = 0;
  for (let i = 0; i <= 27; i++) {
    const checkDate = subDays(today, i);
    const hasActivity = activityDays.some(
      (a) => isSameDay(a.date, checkDate) && a.activityMinutes > 0
    );
    if (hasActivity) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Weekly Activity</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-lg">{streak} day streak</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayLabels.map((day) => (
              <div key={day} className="text-xs text-muted-foreground text-center">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const level = getActivityLevel(day);
                const isToday = isSameDay(day, today);
                const isFuture = day > today;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      aspect-square rounded-sm transition-colors
                      ${isFuture ? "bg-transparent" : getActivityColor(level)}
                      ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                    `}
                    title={`${format(day, "MMM d")}: ${
                      activityDays.find((a) => isSameDay(a.date, day))?.activityMinutes || 0
                    } minutes`}
                  />
                );
              })}
            </div>
          ))}
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
