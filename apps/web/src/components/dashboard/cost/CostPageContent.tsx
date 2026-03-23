"use client";

import { useState, useEffect } from "react";
import { CostMetrics } from "./CostMetrics";
import { MonthlyTrend } from "./MonthlyTrend";
import { CostByProject } from "./CostByProject";
import { CostByDeveloper } from "./CostByDeveloper";
import { CostByProvider } from "./CostByProvider";
import { ProviderFilter, type ProviderFilterValue } from "@/components/shared/ProviderFilter";

interface MonthStats {
  total_cost: number;
  total_tokens: number;
  task_count: number;
  avg_cost_per_task: number;
}

interface MonthlyTrendData {
  month: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
}

interface ProjectCost {
  project_slug: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface DeveloperCost {
  developer_alias: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface ProviderCost {
  tool_source: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface CostData {
  monthStats: MonthStats;
  monthlyTrend: MonthlyTrendData[];
  costByProject: ProjectCost[];
  costByDeveloper: DeveloperCost[];
  costByProvider: ProviderCost[];
}

interface CostPageContentProps {
  initialData: CostData;
  distinctProviders: string[];
}

export function CostPageContent({ initialData, distinctProviders }: CostPageContentProps) {
  const [provider, setProvider] = useState<ProviderFilterValue>("all");
  const [data, setData] = useState<CostData>(initialData);
  const [loading, setLoading] = useState(false);

  const showProviderFilter = distinctProviders.length > 1;

  useEffect(() => {
    if (provider === "all") {
      setData(initialData);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/cost?provider=${provider}`);
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (error) {
        console.error("Failed to fetch cost data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [provider, initialData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cost & Usage</h1>
          <p className="text-muted-foreground">
            Track AI tool spending across your workspace
          </p>
        </div>
        {showProviderFilter && (
          <ProviderFilter value={provider} onChange={setProvider} />
        )}
      </div>

      <div className={loading ? "opacity-50 pointer-events-none" : ""}>
        {/* This Month Metrics */}
        <CostMetrics
          totalCost={data.monthStats.total_cost}
          totalTokens={data.monthStats.total_tokens}
          taskCount={data.monthStats.task_count}
          avgCostPerTask={data.monthStats.avg_cost_per_task}
        />

        {/* Monthly Trend Chart */}
        <div className="mt-6">
          <MonthlyTrend data={data.monthlyTrend} />
        </div>

        {/* Provider Breakdown - Show if multiple providers exist and viewing all */}
        {provider === "all" && data.costByProvider.length > 1 && (
          <div className="mt-6">
            <CostByProvider data={data.costByProvider} />
          </div>
        )}

        {/* Cost Breakdowns */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CostByProject data={data.costByProject} />
          <CostByDeveloper data={data.costByDeveloper} />
        </div>
      </div>
    </div>
  );
}
