"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  data: Record<string, number>;
  weeks?: number;
}

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return "bg-muted";
  const ratio = count / max;
  if (ratio < 0.25) return "bg-primary/25";
  if (ratio < 0.5) return "bg-primary/50";
  if (ratio < 0.75) return "bg-primary/75";
  return "bg-primary";
}

function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday, 6 = Saturday
}

export function Heatmap({ data, weeks = 26 }: HeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find max value for intensity calculation
  const maxCount = Math.max(...Object.values(data), 1);

  // Generate all dates for the heatmap
  const totalDays = weeks * 7;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  // Adjust to start on Sunday
  const startDayOfWeek = getDayOfWeek(startDate);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  // Build weeks array
  const weeksArray: { date: Date; count: number }[][] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= today) {
    const week: { date: Date; count: number }[] = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      week.push({
        date: new Date(currentDate),
        count: data[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeksArray.push(week);
  }

  // Month labels
  const months: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeksArray.forEach((week, weekIndex) => {
    const firstDay = week[0];
    const month = firstDay.date.getMonth();
    if (month !== lastMonth) {
      months.push({
        label: firstDay.date.toLocaleDateString("en-US", { month: "short" }),
        weekIndex,
      });
      lastMonth = month;
    }
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {months.map((month, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground"
                style={{
                  marginLeft: i === 0 ? `${month.weekIndex * 12}px` : undefined,
                  width: i < months.length - 1
                    ? `${(months[i + 1].weekIndex - month.weekIndex) * 12}px`
                    : "auto",
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-2">
              {dayLabels.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "h-[10px] text-[10px] text-muted-foreground leading-none",
                    i % 2 === 1 ? "opacity-100" : "opacity-0"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-0.5">
              {weeksArray.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {week.map((day, dayIndex) => {
                    const isFuture = day.date > today;
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "h-[10px] w-[10px] rounded-sm",
                          isFuture
                            ? "bg-transparent"
                            : getIntensityClass(day.count, maxCount)
                        )}
                        title={
                          isFuture
                            ? ""
                            : `${day.date.toLocaleDateString()}: ${day.count} tasks`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-0.5">
              <div className="h-[10px] w-[10px] rounded-sm bg-muted" />
              <div className="h-[10px] w-[10px] rounded-sm bg-primary/25" />
              <div className="h-[10px] w-[10px] rounded-sm bg-primary/50" />
              <div className="h-[10px] w-[10px] rounded-sm bg-primary/75" />
              <div className="h-[10px] w-[10px] rounded-sm bg-primary" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
