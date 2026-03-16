import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost } from "@afterburn/shared";

interface MonthData {
  month: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
}

interface MonthlyTrendProps {
  data: MonthData[];
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCost = Math.max(...data.map((d) => d.total_cost));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Cost Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-48">
          {data.map((month) => {
            const heightPercent = maxCost > 0 ? (month.total_cost / maxCost) * 100 : 0;

            return (
              <div
                key={month.month}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full flex flex-col items-center justify-end h-36">
                  <span className="text-xs text-muted-foreground mb-1">
                    {formatCost(month.total_cost)}
                  </span>
                  <div
                    className="w-full bg-primary rounded-t transition-all"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatMonth(month.month)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
