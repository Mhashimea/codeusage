"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/shared/DataTable";
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
import { formatCost, formatTokens } from "@afterburn/shared";
import { Download } from "lucide-react";
import type { Task } from "@/lib/db/schema";

interface TaskListProps {
  tasks: Task[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export function TaskList({ tasks, pagination }: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/tasks?${params.toString()}`);
  };

  const handleExportCSV = () => {
    // Build CSV content
    const headers = [
      "Developer",
      "Project",
      "Provider",
      "Model",
      "Input Tokens",
      "Output Tokens",
      "Cache Tokens",
      "Cost (USD)",
      "Files Changed",
      "Duration (sec)",
      "Created At",
    ];

    const rows = tasks.map((task) => [
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

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "developer_alias",
      header: "Developer",
      render: (task: Task) => (
        <span className="font-medium">{task.developer_alias}</span>
      ),
    },
    {
      key: "project_slug",
      header: "Project",
      render: (task: Task) => (
        <Badge variant="secondary">{task.project_slug}</Badge>
      ),
    },
    {
      key: "tool_source",
      header: "Provider",
      render: (task: Task) => (
        <ProviderBadge providerId={task.tool_source} showLabel={false} />
      ),
    },
    {
      key: "tokens",
      header: "Tokens",
      render: (task: Task) => (
        <span className="text-sm">
          {formatTokens(task.input_tokens + task.output_tokens)}
        </span>
      ),
    },
    {
      key: "cost_usd",
      header: "Cost",
      render: (task: Task) => (
        <span className="font-medium text-green-500">
          {formatCost(parseFloat(task.cost_usd))}
        </span>
      ),
    },
    {
      key: "files_changed",
      header: "Files",
      render: (task: Task) => task.files_changed,
    },
    {
      key: "task_duration_sec",
      header: "Duration",
      render: (task: Task) => {
        const secs = task.task_duration_sec;
        if (secs < 60) return `${secs}s`;
        return `${Math.floor(secs / 60)}m`;
      },
    },
    {
      key: "created_at",
      header: "Time",
      render: (task: Task) => (
        <span className="text-sm text-muted-foreground">
          {new Date(task.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  // Calculate summary stats
  const totalCost = tasks.reduce(
    (sum, task) => sum + parseFloat(task.cost_usd),
    0
  );
  const totalTokens = tasks.reduce(
    (sum, task) => sum + task.input_tokens + task.output_tokens,
    0
  );

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{pagination.total} tasks</span>
          </div>
          <div>
            <span className="text-muted-foreground">Cost: </span>
            <span className="font-medium text-green-500">
              {formatCost(totalCost)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Tokens: </span>
            <span className="font-medium">{formatTokens(totalTokens)}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={tasks}
        keyField="id"
        emptyMessage="No tasks found. Connect the CLI to start tracking."
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={setSelectedTask}
      />

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="w-[450px] sm:max-w-[450px] p-6">
          <SheetHeader className="pb-4">
            <SheetTitle>Task Details</SheetTitle>
          </SheetHeader>
          {selectedTask && <TaskDetailPanel task={selectedTask} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
