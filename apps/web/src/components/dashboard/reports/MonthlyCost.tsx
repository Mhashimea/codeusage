"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCost, formatTokens } from "@afterburn/shared";

interface ProjectCost {
  project: string;
  cost: number;
  task_count: number;
}

interface DeveloperCost {
  developer: string;
  cost: number;
  task_count: number;
}

interface MonthlyCostProps {
  data: {
    month: string;
    month_start: string;
    month_end: string;
    total_tasks: number;
    total_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cache_tokens: number;
    total_files: number;
    unique_developers: number;
    unique_projects: number;
    avg_cost_per_task: number;
    cost_by_project: ProjectCost[];
    cost_by_developer: DeveloperCost[];
  };
}

export function MonthlyCost({ data }: MonthlyCostProps) {
  const handleExportCSV = () => {
    const lines = [
      `Monthly Cost Report - ${data.month}`,
      "",
      "Summary",
      `Total Tasks,${data.total_tasks}`,
      `Total Cost,${data.total_cost.toFixed(6)}`,
      `Input Tokens,${data.total_input_tokens}`,
      `Output Tokens,${data.total_output_tokens}`,
      `Cache Tokens,${data.total_cache_tokens}`,
      `Files Changed,${data.total_files}`,
      `Active Developers,${data.unique_developers}`,
      `Active Projects,${data.unique_projects}`,
      `Avg Cost/Task,${data.avg_cost_per_task.toFixed(6)}`,
      "",
      "Cost by Project",
      "Project,Cost,Tasks",
      ...data.cost_by_project.map(
        (p) => `${p.project},${p.cost.toFixed(6)},${p.task_count}`
      ),
      "",
      "Cost by Developer",
      "Developer,Cost,Tasks",
      ...data.cost_by_developer.map(
        (d) => `${d.developer},${d.cost.toFixed(6)},${d.task_count}`
      ),
    ];

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-cost-${data.month_start.substring(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCost = data.cost_by_project.reduce((sum, p) => sum + p.cost, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monthly Cost Report</CardTitle>
          <p className="text-sm text-muted-foreground">{data.month}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-xl font-bold text-green-500">
              {formatCost(data.total_cost)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Tasks</p>
            <p className="text-xl font-bold">{data.total_tasks}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Avg/Task</p>
            <p className="text-xl font-bold">{formatCost(data.avg_cost_per_task)}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Developers</p>
            <p className="text-xl font-bold">{data.unique_developers}</p>
          </div>
        </div>

        {/* Token Breakdown */}
        <div>
          <h4 className="font-medium mb-2">Token Breakdown</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground">Input</p>
              <p className="font-medium">{formatTokens(data.total_input_tokens)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground">Output</p>
              <p className="font-medium">{formatTokens(data.total_output_tokens)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground">Cache</p>
              <p className="font-medium">{formatTokens(data.total_cache_tokens)}</p>
            </div>
          </div>
        </div>

        {/* Cost by Project */}
        <div>
          <h4 className="font-medium mb-2">Cost by Project</h4>
          {data.cost_by_project.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project data.</p>
          ) : (
            <div className="space-y-2">
              {data.cost_by_project.slice(0, 5).map((project) => {
                const percentage =
                  totalCost > 0 ? (project.cost / totalCost) * 100 : 0;
                return (
                  <div key={project.project} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{project.project}</span>
                      <span className="text-green-500 font-medium">
                        {formatCost(project.cost)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
