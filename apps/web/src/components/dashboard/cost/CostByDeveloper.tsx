import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens } from "@afterburn/shared";

interface DeveloperCost {
  developer_alias: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface CostByDeveloperProps {
  data: DeveloperCost[];
}

export function CostByDeveloper({ data }: CostByDeveloperProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost by Developer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No developer data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Developer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((dev) => (
            <div
              key={dev.developer_alias}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {dev.developer_alias.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{dev.developer_alias}</p>
                  <p className="text-xs text-muted-foreground">
                    {dev.task_count} tasks · {formatTokens(dev.total_tokens)} tokens
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${dev.share_percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {dev.share_percentage.toFixed(1)}%
                  </p>
                </div>
                <p className="font-medium text-green-500 min-w-[80px] text-right">
                  {formatCost(dev.total_cost)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
