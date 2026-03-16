import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokens, formatCost } from "@afterburn/shared";

interface ProjectData {
  project_slug: string;
  total_tokens: number;
  total_cost_usd: number;
  task_count: number;
}

interface TopProjectsProps {
  projects: ProjectData[];
}

export function TopProjects({ projects }: TopProjectsProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No project data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxTokens = Math.max(...projects.map((p) => p.total_tokens));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Projects by Token Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => {
            const percentage = maxTokens > 0 ? (project.total_tokens / maxTokens) * 100 : 0;

            return (
              <div key={project.project_slug} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">
                    {project.project_slug}
                  </span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{formatTokens(project.total_tokens)} tokens</span>
                    <span className="text-green-500">
                      {formatCost(project.total_cost_usd)}
                    </span>
                    <span className="text-xs">
                      {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
