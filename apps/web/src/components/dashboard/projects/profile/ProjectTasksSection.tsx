"use client";

import { useState, useMemo, useId } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, parse, subDays, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskDetailPanel } from "@/components/shared/TaskDetailPanel";
import { ProviderBadge } from "@/components/shared/ProviderBadge";
import { formatCost, formatTokens } from "@codeusage/shared";
import { ListTodo, Calendar as CalendarIcon, Clock, FileCode, Coins, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";

interface ProjectTasksSectionProps {
  tasks: Task[];
  developers: string[];
  projectSlug: string;
}

function formatTaskTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, "MMM d");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export function ProjectTasksSection({ tasks, developers, projectSlug }: ProjectTasksSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const datePickerTriggerId = useId();
  const developerSelectTriggerId = useId();

  // Parse filters from URL
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const developerParam = searchParams.get("developer") || "all";

  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!startDateParam) return undefined;
    try {
      const from = parse(startDateParam, "yyyy-MM-dd", new Date());
      const to = endDateParam ? parse(endDateParam, "yyyy-MM-dd", new Date()) : from;
      return { from, to };
    } catch {
      return undefined;
    }
  }, [startDateParam, endDateParam]);

  // Filter tasks based on URL params
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by developer
      if (developerParam !== "all" && task.developer_alias !== developerParam) {
        return false;
      }
      // Filter by date range
      if (dateRange?.from) {
        const taskDate = new Date(task.created_at);
        const endDate = dateRange.to || dateRange.from;
        // Set end of day for the end date
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (!isWithinInterval(taskDate, { start: dateRange.from, end: endOfDay })) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, developerParam, dateRange]);

  // Calculate summary stats
  const totalCost = filteredTasks.reduce((sum, t) => sum + parseFloat(t.cost_usd), 0);
  const totalTokens = filteredTasks.reduce((sum, t) => sum + t.input_tokens + t.output_tokens, 0);

  const updateFilters = (params: URLSearchParams) => {
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDateChange = (range: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range?.from) {
      params.set("startDate", format(range.from, "yyyy-MM-dd"));
      if (range.to) {
        params.set("endDate", format(range.to, "yyyy-MM-dd"));
      } else {
        params.delete("endDate");
      }
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }
    updateFilters(params);
  };

  const handleDeveloperChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("developer", value);
    } else {
      params.delete("developer");
    }
    updateFilters(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    updateFilters(params);
  };

  const hasFilters = startDateParam || developerParam !== "all";

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-medium">Tasks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                {hasFilters && " (filtered)"}
                {" · "}
                <span className="text-emerald-500">{formatCost(totalCost)}</span>
                {" · "}
                {formatTokens(totalTokens)} tokens
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={datePickerTriggerId}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateRange?.from ? (
                      dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                        <span className="text-xs">
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </span>
                      ) : (
                        <span className="text-xs">{format(dateRange.from, "MMM d, yyyy")}</span>
                      )
                    ) : (
                      <span className="text-xs">All time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from || thirtyDaysAgo}
                    selected={dateRange}
                    onSelect={handleDateChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Developer Filter */}
              {developers.length > 1 && (
                <Select value={developerParam} onValueChange={handleDeveloperChange}>
                  <SelectTrigger id={developerSelectTriggerId} className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="All developers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All developers</SelectItem>
                    {developers.map((developer) => (
                      <SelectItem key={developer} value={developer}>
                        {developer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Clear Filters */}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <ListTodo className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No tasks found</p>
              <p className="text-xs text-muted-foreground">
                {hasFilters ? "Try adjusting your filters" : "No tasks recorded yet"}
              </p>
            </div>
          ) : (
            <div className="h-[400px] overflow-y-auto pr-2 -mr-2">
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {/* Provider Icon */}
                    <div className="shrink-0 mt-0.5">
                      <ProviderBadge providerId={task.tool_source} showLabel={false} />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{task.model_name}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <User className="h-2.5 w-2.5 mr-1" />
                              {task.developer_alias}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTaskTime(task.created_at.toString())}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-emerald-500 text-sm">
                            {formatCost(parseFloat(task.cost_usd))}
                          </p>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(task.task_duration_sec)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          <span>{formatTokens(task.input_tokens + task.output_tokens)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" />
                          <span>{task.files_changed} files</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-hidden">
          <div className="flex flex-col h-full">
            <SheetHeader className="shrink-0">
              <SheetTitle>Task Details</SheetTitle>
              {selectedTask?.session_id && (
                <p
                  className="text-xs text-muted-foreground font-mono truncate"
                  title={selectedTask.session_id}
                >
                  Session: {selectedTask.session_id}
                </p>
              )}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {selectedTask && <TaskDetailPanel task={selectedTask} />}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
