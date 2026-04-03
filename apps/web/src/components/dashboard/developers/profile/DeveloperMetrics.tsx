import { Card, CardContent } from "@/components/ui/card";
import { formatTokens } from "@codeusage/shared";
import { Zap, ListTodo, FileCode, FolderKanban, Database } from "lucide-react";

interface DeveloperMetricsProps {
  stats: {
    totalTasks: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheTokens: number;
    totalCost: number;
    totalFilesChanged: number;
    uniqueProjects: number;
  };
}

export function DeveloperMetrics({ stats }: DeveloperMetricsProps) {
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  return (
    <div className="space-y-6">
      {/* Hero Stats - Tokens */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">Total Tokens</p>
              <p className="text-4xl font-bold text-blue-400 mt-2">
                {formatTokens(totalTokens)}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>{formatTokens(stats.totalInputTokens)} in</span>
                <span>·</span>
                <span>{formatTokens(stats.totalOutputTokens)} out</span>
              </div>
            </div>
            <div className="rounded-xl bg-blue-500/20 p-3">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ListTodo className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalTasks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileCode className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFilesChanged.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Files Changed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueProjects}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTokens(stats.totalCacheTokens)}</p>
                <p className="text-xs text-muted-foreground">Cache Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
