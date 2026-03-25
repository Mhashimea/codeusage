"use client";

import { formatCost, formatTokens, formatModelName, PROVIDERS, type ProviderId, type FileChangeDetail } from "@codeusage/shared";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Coins,
  FileCode,
  Wrench,
  User,
  FolderKanban,
  Calendar,
  Cpu,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolUsage {
  name: string;
  count: number;
}

interface TaskDetailPanelProps {
  task: {
    id: string;
    developer_alias: string;
    project_slug: string;
    tool_source: string;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    cache_tokens: number;
    cost_usd: number | string;
    files_changed: number;
    files_changed_details?: FileChangeDetail[];
    tools_used: ToolUsage[];
    task_duration_sec: number;
    hook_scope: string;
    cli_version?: string | null;
    created_at: Date | string;
  };
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const costUsd =
    typeof task.cost_usd === "string" ? parseFloat(task.cost_usd) : task.cost_usd;

  const createdAt =
    typeof task.created_at === "string" ? new Date(task.created_at) : task.created_at;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="space-y-5">
      {/* Basic Info Grid */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground shrink-0">Developer:</span>
          <span className="font-medium truncate">{task.developer_alias}</span>
        </div>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground shrink-0">Project:</span>
          <span className="font-medium truncate">{task.project_slug}</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Provider:</span>
          <span className="font-medium text-emerald-500">
            {PROVIDERS[task.tool_source as ProviderId]?.displayName || task.tool_source}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Model:</span>
          <span className="font-medium">{formatModelName(task.model_name)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Time:</span>
          <span className="font-medium">{createdAt.toLocaleString()}</span>
        </div>
      </div>

      <Separator />

      {/* Token Usage */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-muted-foreground">Token Usage</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Input</p>
            <p className="text-xl font-semibold">{formatTokens(task.input_tokens)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Output</p>
            <p className="text-xl font-semibold">{formatTokens(task.output_tokens)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Cache</p>
            <p className="text-xl font-semibold">{formatTokens(task.cache_tokens)}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="font-semibold text-green-500">{formatCost(costUsd)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-semibold">{formatDuration(task.task_duration_sec)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-purple-500" />
          <div>
            <p className="text-xs text-muted-foreground">Files</p>
            <p className="font-semibold">{task.files_changed}</p>
          </div>
        </div>
      </div>

      {/* Files Changed */}
      {task.files_changed_details && task.files_changed_details.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground">Files Changed</h4>
            </div>
            <TooltipProvider delay={0}>
              <div className="space-y-2">
                {task.files_changed_details.map((file) => {
                  // Get just the filename from the path
                  const filename = file.path.split('/').pop() || file.path;
                  // Get shortened directory path (last 2-3 segments)
                  const pathParts = file.path.split('/');
                  pathParts.pop(); // Remove filename
                  const dirPath = pathParts.length > 3
                    ? '.../' + pathParts.slice(-2).join('/')
                    : pathParts.join('/');
                  const totalChanges = file.additions + file.deletions;

                  return (
                    <div key={file.path} className="rounded-md border border-border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 flex items-start gap-2">
                          <Tooltip>
                            <TooltipTrigger className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors">
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">
                              <p className="font-mono text-xs break-all">{file.path}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-medium truncate">
                              {filename}
                            </p>
                            {dirPath && (
                              <p className="font-mono text-xs text-muted-foreground truncate">
                                {dirPath}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">{totalChanges} changes</p>
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <span className="text-green-500">+{file.additions}</span>
                            <span className="text-red-500">-{file.deletions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        </>
      )}

      {/* Tools Used */}
      {task.tools_used && task.tools_used.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground">Tools Used</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {task.tools_used.map((tool) => (
                <Badge key={tool.name} variant="secondary" className="text-xs">
                  {tool.name} ({tool.count})
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Metadata Footer */}
      <Separator />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Scope: {task.hook_scope}</span>
        {task.cli_version && <span>CLI v{task.cli_version}</span>}
      </div>
    </div>
  );
}
