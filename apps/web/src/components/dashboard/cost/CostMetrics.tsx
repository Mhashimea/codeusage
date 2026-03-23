import { Card, CardContent } from "@/components/ui/card";
import { formatCost, formatTokens } from "@afterburn/shared";
import { Coins, Zap, ListTodo, Calculator } from "lucide-react";

interface CostMetricsProps {
  totalCost: number;
  totalTokens: number;
  taskCount: number;
  avgCostPerTask: number;
}

export function CostMetrics({
  totalCost,
  totalTokens,
  taskCount,
  avgCostPerTask,
}: CostMetricsProps) {
  const metrics = [
    {
      title: "Total Cost",
      value: formatCost(totalCost),
      subtitle: "This month",
      icon: Coins,
      highlight: true,
    },
    {
      title: "Total Tokens",
      value: formatTokens(totalTokens),
      subtitle: "This month",
      icon: Zap,
    },
    {
      title: "Tasks",
      value: taskCount.toLocaleString(),
      subtitle: "This month",
      icon: ListTodo,
    },
    {
      title: "Avg per Task",
      value: formatCost(avgCostPerTask),
      subtitle: "Cost average",
      icon: Calculator,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className={`text-2xl font-bold mt-1 ${metric.highlight ? 'text-emerald-500' : 'text-foreground'}`}>
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <metric.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
