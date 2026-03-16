import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens } from "@afterburn/shared";

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
          <CardTitle>Cost by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No project data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Project</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((project) => (
            <div key={project.project_slug} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[200px]">
                  {project.project_slug}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {formatTokens(project.total_tokens)} tokens
                  </span>
                  <span className="font-medium text-green-500 min-w-[80px] text-right">
                    {formatCost(project.total_cost)}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${project.share_percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
