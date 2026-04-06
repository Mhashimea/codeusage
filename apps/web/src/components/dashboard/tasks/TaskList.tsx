"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskDetailPanel } from "@/components/shared/TaskDetailPanel";
import { ProviderBadge } from "@/components/shared/ProviderBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatTokens } from "@codeusage/shared";
import { Download, RefreshCw, ChevronRight, Clock, Hash, Zap } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import type { SessionGroup } from "@/lib/db/queries/tasks";

interface TaskListProps {
  sessionGroups: SessionGroup[];
  pagination: {
    page: number;
    pageSize: number;
    totalSessions: number;
    totalTasks: number;
  };
}

export function TaskList({ sessionGroups, pagination }: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/app/tasks?${params.toString()}`);
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "Session ID",
      "Developer",
      "Project",
      "Provider",
      "Model",
      "Input Tokens",
      "Output Tokens",
      "Cache Tokens",
      "Cost (USD)",
      "Files",
      "Duration (sec)",
      "Created At",
    ];

    // Flatten all tasks from all session groups
    const allTasks = sessionGroups.flatMap((group) => group.tasks);
    const rows = allTasks.map((task) => [
      task.session_id || "",
      task.developer_alias,
      task.project_slug,
      task.tool_source,
      task.model_name,
      task.input_tokens,
      task.output_tokens,
      task.cache_tokens,
      task.cost_usd,
      task.files_changed,
      task.task_duration_sec,
      new Date(task.created_at).toISOString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Calculate summary stats from session groups
  const totalTokens = sessionGroups.reduce(
    (sum, group) => sum + group.totalTokens,
    0
  );

  const totalPages = Math.ceil(pagination.totalSessions / pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Sessions: </span>
            <span className="font-medium">{sessionGroups.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tasks: </span>
            <span className="font-medium">{pagination.totalTasks}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tokens: </span>
            <span className="font-medium">{formatTokens(totalTokens)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Session Groups */}
      <div className="space-y-2">
        {sessionGroups.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            No tasks found. Connect the CLI to start tracking.
          </div>
        ) : (
          sessionGroups.map((group) => (
            <Collapsible
              key={group.session_id}
              open={expandedSessions.has(group.session_id)}
              onOpenChange={() => toggleSession(group.session_id)}
            >
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedSessions.has(group.session_id) ? "rotate-90" : ""
                        }`}
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm truncate max-w-[200px]" title={group.session_id}>
                            {group.session_id === "no-session"
                              ? "No Session"
                              : group.session_id.slice(0, 8) + "..."}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{group.developer}</span>
                          <span>•</span>
                          <span>{group.project}</span>
                          <span>•</span>
                          <span>{new Date(group.lastTask).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(group.totalDuration)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{formatTokens(group.totalTokens)}</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border">
                    {group.tasks
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer border-b border-border last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-4" /> {/* Spacer for alignment */}
                            <ProviderBadge providerId={task.tool_source} showLabel={false} />
                            <div>
                              <div className="text-sm font-medium">
                                {task.model_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(task.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-blue-400 font-medium">
                              {formatTokens(task.input_tokens + task.output_tokens)}
                            </span>
                            <span className="text-muted-foreground">
                              {task.files_changed} files
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
