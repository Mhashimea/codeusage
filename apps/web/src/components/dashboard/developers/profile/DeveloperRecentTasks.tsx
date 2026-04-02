"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskDetailPanel } from "@/components/shared/TaskDetailPanel";
import { ProviderBadge } from "@/components/shared/ProviderBadge";
import { formatCost, formatTokens } from "@codeusage/shared";
import { ListTodo } from "lucide-react";
import type { Task } from "@/lib/db/schema";

interface DeveloperRecentTasksProps {
  tasks: Task[];
}

export function DeveloperRecentTasks({ tasks }: DeveloperRecentTasksProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ProviderBadge providerId={task.tool_source} showLabel={false} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {task.model_name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {task.project_slug}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTokens(task.input_tokens + task.output_tokens)} tokens · {task.files_changed} files
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-emerald-500 text-sm">
                    {formatCost(parseFloat(task.cost_usd))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
