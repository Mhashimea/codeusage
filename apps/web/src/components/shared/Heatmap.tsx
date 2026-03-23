"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface HeatmapProps {
  data: Record<string, number>;
  year: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return "bg-muted/50";
  const ratio = count / max;
  if (ratio < 0.25) return "bg-emerald-500/30";
  if (ratio < 0.5) return "bg-emerald-500/50";
  if (ratio < 0.75) return "bg-emerald-500/75";
  return "bg-emerald-500";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function Heatmap({ data, year }: HeatmapProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const currentYear = today.getFullYear();

  // Find max value for intensity calculation
  const maxCount = Math.max(...Object.values(data), 1);

  // Calculate total tasks for the year
  const totalTasks = Object.values(data).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(data).filter(count => count > 0).length;

  const changeYear = useCallback((newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activityYear", newYear.toString());
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-medium">Activity</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {totalTasks.toLocaleString()} tasks across {activeDays} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year + 1)}
            disabled={year >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month grid */}
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-3">
            {MONTHS.map((monthName, monthIndex) => {
              const daysInMonth = getDaysInMonth(year, monthIndex);
              const firstDay = getFirstDayOfMonth(year, monthIndex);

              // Create array of days including empty slots for alignment
              const days: (number | null)[] = [];
              // Add empty slots for days before the 1st
              for (let i = 0; i < firstDay; i++) {
                days.push(null);
              }
              // Add actual days
              for (let day = 1; day <= daysInMonth; day++) {
                days.push(day);
              }

              return (
                <div key={monthIndex} className="min-w-[100px]">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{monthName}</p>
                  <div className="grid grid-cols-7 gap-[2px]">
                    {days.map((day, dayIndex) => {
                      if (day === null) {
                        return <div key={dayIndex} className="h-[12px] w-[12px]" />;
                      }

                      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const count = data[dateStr] || 0;
                      const date = new Date(year, monthIndex, day);
                      const isFuture = date > today;

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "h-[12px] w-[12px] rounded-[2px] transition-colors",
                            isFuture
                              ? "bg-muted/20"
                              : getIntensityClass(count, maxCount)
                          )}
                          title={
                            isFuture
                              ? ""
                              : `${monthName} ${day}, ${year}: ${count} task${count !== 1 ? 's' : ''}`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing activity for {year}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex gap-[2px]">
                <div className="h-[12px] w-[12px] rounded-[2px] bg-muted/50" />
                <div className="h-[12px] w-[12px] rounded-[2px] bg-emerald-500/30" />
                <div className="h-[12px] w-[12px] rounded-[2px] bg-emerald-500/50" />
                <div className="h-[12px] w-[12px] rounded-[2px] bg-emerald-500/75" />
                <div className="h-[12px] w-[12px] rounded-[2px] bg-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
