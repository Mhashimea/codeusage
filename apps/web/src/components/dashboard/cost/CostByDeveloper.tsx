import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens } from "@codeusage/shared";
import { Users } from "lucide-react";

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
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="h-5 w-5 text-muted-foreground" />
            By Developer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No developer data this month
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
          <Users className="h-5 w-5 text-muted-foreground" />
          By Developer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.map((dev, index) => (
            <div
              key={dev.developer_alias}
              className="flex items-center gap-3 py-3 border-b border-border last:border-0"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {dev.developer_alias.charAt(0).toUpperCase()}
              </div>

              {/* Developer Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0 pr-2">
                    <span className="font-medium text-sm truncate block">
                      {dev.developer_alias}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dev.task_count} tasks
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                    {formatCost(dev.total_cost)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all"
                      style={{ width: `${dev.share_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {dev.share_percentage.toFixed(0)}%
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
