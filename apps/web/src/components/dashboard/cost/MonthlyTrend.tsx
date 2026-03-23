import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens } from "@afterburn/shared";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

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
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatMonthShort(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Usage Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No usage data yet. Start using the CLI to track costs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend (comparing last month to previous)
  const currentMonth = data[data.length - 1];
  const previousMonth = data.length > 1 ? data[data.length - 2] : null;

  const costChange = previousMonth
    ? ((currentMonth.total_cost - previousMonth.total_cost) / previousMonth.total_cost) * 100
    : 0;

  const maxCost = Math.max(...data.map((d) => d.total_cost));
  const totalCost = data.reduce((sum, d) => sum + d.total_cost, 0);
  const totalTokens = data.reduce((sum, d) => sum + d.total_tokens, 0);
  const totalTasks = data.reduce((sum, d) => sum + d.task_count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Usage Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCost(totalCost)}</p>
            <p className="text-sm text-muted-foreground">Total Spend</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{formatTokens(totalTokens)}</p>
            <p className="text-sm text-muted-foreground">Total Tokens</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalTasks.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-3">
          {data.map((month, index) => {
            const widthPercent = maxCost > 0 ? (month.total_cost / maxCost) * 100 : 0;
            const isCurrentMonth = index === data.length - 1;

            return (
              <div key={month.month} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {formatMonth(month.month)}
                    </span>
                    {isCurrentMonth && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {month.task_count} tasks
                    </span>
                    <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {formatCost(month.total_cost)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isCurrentMonth ? 'bg-emerald-500' : 'bg-primary/40'}`}
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Month-over-Month Change */}
        {previousMonth && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              {costChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-amber-500" />
              ) : costChange < 0 ? (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}% vs last month
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
