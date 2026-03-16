import { MetricCard } from "@/components/shared/MetricCard";
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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Cost (This Month)"
        value={formatCost(totalCost)}
        subtitle="Estimated spend"
        icon={Coins}
      />
      <MetricCard
        title="Total Tokens"
        value={formatTokens(totalTokens)}
        subtitle="This month"
        icon={Zap}
      />
      <MetricCard
        title="Tasks"
        value={taskCount.toLocaleString()}
        subtitle="This month"
        icon={ListTodo}
      />
      <MetricCard
        title="Avg Cost per Task"
        value={formatCost(avgCostPerTask)}
        subtitle="This month"
        icon={Calculator}
      />
    </div>
  );
}
