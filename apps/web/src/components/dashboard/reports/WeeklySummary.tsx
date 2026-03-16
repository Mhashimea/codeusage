"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCost, formatTokens } from "@afterburn/shared";

interface DailyData {
  date: string;
  task_count: number;
  cost: number;
}

interface Contributor {
  developer: string;
  task_count: number;
  cost: number;
}

interface WeeklySummaryProps {
  data: {
    week_start: string;
    week_end: string;
    total_tasks: number;
    total_cost: number;
    total_tokens: number;
    total_files: number;
    unique_developers: number;
    unique_projects: number;
    daily_breakdown: DailyData[];
    top_contributors: Contributor[];
  };
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() - 1); // End is exclusive

  const startStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

export function WeeklySummary({ data }: WeeklySummaryProps) {
  const handleExportCSV = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Week", formatDateRange(data.week_start, data.week_end)],
      ["Total Tasks", data.total_tasks],
      ["Total Cost", formatCost(data.total_cost)],
      ["Total Tokens", data.total_tokens],
      ["Files Changed", data.total_files],
      ["Active Developers", data.unique_developers],
      ["Active Projects", data.unique_projects],
    ];

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${data.week_start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Weekly Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(data.week_start, data.week_end)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary Stats */}
          <div className="space-y-4">
            <h4 className="font-medium">Overview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-2xl font-bold">{data.total_tasks}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCost(data.total_cost)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Tokens</p>
                <p className="text-2xl font-bold">{formatTokens(data.total_tokens)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Files</p>
                <p className="text-2xl font-bold">{data.total_files}</p>
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          <div className="space-y-4">
            <h4 className="font-medium">Top Contributors</h4>
            {data.top_contributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity this week.</p>
            ) : (
              <div className="space-y-2">
                {data.top_contributors.map((contributor, i) => (
                  <div
                    key={contributor.developer}
                    className="flex items-center justify-between rounded-lg border border-border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="font-medium">{contributor.developer}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm">{contributor.task_count} tasks</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatCost(contributor.cost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
