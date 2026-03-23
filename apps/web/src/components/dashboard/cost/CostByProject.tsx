import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens } from "@afterburn/shared";
import { FolderGit2 } from "lucide-react";

interface ProjectCost {
  project_slug: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface CostByProjectProps {
  data: ProjectCost[];
}

export function CostByProject({ data }: CostByProjectProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FolderGit2 className="h-5 w-5 text-muted-foreground" />
            By Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FolderGit2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No project data this month
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FolderGit2 className="h-5 w-5 text-muted-foreground" />
          By Project
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.map((project, index) => (
            <div
              key={project.project_slug}
              className="flex items-center gap-3 py-3 border-b border-border last:border-0"
            >
              {/* Rank */}
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>

              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate pr-2">
                    {project.project_slug}
                  </span>
                  <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                    {formatCost(project.total_cost)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all"
                      style={{ width: `${project.share_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {project.share_percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
