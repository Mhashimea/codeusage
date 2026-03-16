"use client";

import { formatCost, formatTokens } from "@afterburn/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Coins,
  FileCode,
  Cpu,
  Wrench,
  User,
  FolderKanban,
  Calendar,
} from "lucide-react";

interface ToolUsage {
  name: string;
  count: number;
}

interface TaskDetailPanelProps {
  task: {
    id: string;
    developer_alias: string;
    project_slug: string;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    cache_tokens: number;
    cost_usd: number | string;
    files_changed: number;
    tools_used: ToolUsage[];
    task_duration_sec: number;
    hook_scope: string;
    cli_version?: string | null;
    created_at: Date | string;
  };
  onClose?: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const costUsd = typeof task.cost_usd === "string"
    ? parseFloat(task.cost_usd)
    : task.cost_usd;

  const createdAt = typeof task.created_at === "string"
    ? new Date(task.created_at)
    : task.created_at;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Task Details</CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Developer:</span>
            <span className="font-medium">{task.developer_alias}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Project:</span>
            <span className="font-medium">{task.project_slug}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Model:</span>
            <span className="font-medium">{task.model_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">
              {createdAt.toLocaleString()}
            </span>
          </div>
        </div>

        <Separator />

        {/* Token Breakdown */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Token Usage</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Input</p>
              <p className="text-lg font-semibold">
                {formatTokens(task.input_tokens)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Output</p>
              <p className="text-lg font-semibold">
                {formatTokens(task.output_tokens)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Cache</p>
              <p className="text-lg font-semibold">
                {formatTokens(task.cache_tokens)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Cost</p>
              <p className="font-medium">{formatCost(costUsd)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(task.task_duration_sec)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Files Changed</p>
              <p className="font-medium">{task.files_changed}</p>
            </div>
          </div>
        </div>

        {/* Tools Used */}
        {task.tools_used && task.tools_used.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Tools Used</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tools_used.map((tool) => (
                  <Badge key={tool.name} variant="secondary">
                    {tool.name} ({tool.count})
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Scope: {task.hook_scope}</span>
          {task.cli_version && <span>CLI v{task.cli_version}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
