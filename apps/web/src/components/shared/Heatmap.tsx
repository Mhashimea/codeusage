"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

interface HeatmapProps {
  initialData: Record<string, number>;
  initialYear: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return "bg-muted/50 dark:bg-muted/30";
  const ratio = count / max;
  if (ratio < 0.25) return "bg-emerald-500/30";
  if (ratio < 0.5) return "bg-emerald-500/50";
  if (ratio < 0.75) return "bg-emerald-500/75";
  return "bg-emerald-500";
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeeksForYear(year: number): Date[][] {
  const weeks: Date[][] = [];

  // Start from the first Sunday on or before Jan 1
  const jan1 = new Date(year, 0, 1);
  const startDate = new Date(jan1);
  startDate.setDate(jan1.getDate() - jan1.getDay());

  // End at the last Saturday on or after Dec 31
  const dec31 = new Date(year, 11, 31);
  const endDate = new Date(dec31);
  endDate.setDate(dec31.getDate() + (6 - dec31.getDay()));

  let currentDate = new Date(startDate);
  let currentWeek: Date[] = [];

  while (currentDate <= endDate) {
    currentWeek.push(new Date(currentDate));

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

export function Heatmap({ initialData, initialYear }: HeatmapProps) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<Record<string, number>>(initialData);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const currentYear = today.getFullYear();

  // Fetch data when year changes
  useEffect(() => {
    if (year === initialYear) {
      setData(initialData);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/activity?year=${year}`);
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (error) {
        console.error("Failed to fetch activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, initialYear, initialData]);

  // Calculate weeks grid
  const weeks = useMemo(() => getWeeksForYear(year), [year]);

  // Find max value for intensity calculation
  const maxCount = Math.max(...Object.values(data), 1);

  // Calculate total tasks for the year
  const totalTasks = Object.values(data).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(data).filter(count => count > 0).length;

  // Calculate month labels with their positions
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // Check the first day of the week that falls in the target year
      const relevantDay = week.find(d => d.getFullYear() === year);
      if (relevantDay) {
        const month = relevantDay.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks, year]);

  const changeYear = (newYear: number) => {
    setYear(newYear);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-medium">Activity</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </span>
            ) : (
              <>{totalTasks.toLocaleString()} tasks across {activeDays} days</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year - 1)}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year + 1)}
            disabled={year >= currentYear || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={0}>
          <div className={cn("w-full overflow-x-auto transition-opacity", loading && "opacity-50")}>
            {/* Month labels */}
            <div className="flex ml-10 mb-1">
              {monthLabels.map(({ month, weekIndex }, idx) => {
                const nextWeekIndex = monthLabels[idx + 1]?.weekIndex ?? weeks.length;
                const width = (nextWeekIndex - weekIndex) * 13; // 11px cell + 2px gap
                return (
                  <div
                    key={`${month}-${weekIndex}`}
                    className="text-xs text-muted-foreground"
                    style={{ width: `${width}px` }}
                  >
                    {month}
                  </div>
                );
              })}
            </div>

            {/* Grid with day labels */}
            <div className="flex">
              {/* Day labels - show all days */}
              <div className="flex flex-col gap-0.5 mr-2 text-xs text-muted-foreground shrink-0">
                {DAYS.map((day) => (
                  <div key={day} className="h-[11px] leading-[11px] w-8">
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks grid */}
              <div className="flex gap-0.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((date, dayIndex) => {
                      const dateStr = formatDate(date);
                      const count = data[dateStr] || 0;
                      const isCurrentYear = date.getFullYear() === year;
                      const isFuture = date > today;
                      const isOutOfRange = !isCurrentYear;

                      return (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger
                            className={cn(
                              "h-[11px] w-[11px] rounded-sm",
                              isOutOfRange
                                ? "bg-transparent"
                                : isFuture
                                  ? "bg-muted/20"
                                  : getIntensityClass(count, maxCount)
                            )}
                          />
                          {!isOutOfRange && !isFuture && (
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{count} task{count !== 1 ? 's' : ''}</p>
                              <p className="text-muted-foreground">
                                {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-0.5">
                  <div className="h-[11px] w-[11px] rounded-sm bg-muted/50 dark:bg-muted/30" />
                  <div className="h-[11px] w-[11px] rounded-sm bg-emerald-500/30" />
                  <div className="h-[11px] w-[11px] rounded-sm bg-emerald-500/50" />
                  <div className="h-[11px] w-[11px] rounded-sm bg-emerald-500/75" />
                  <div className="h-[11px] w-[11px] rounded-sm bg-emerald-500" />
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
