"use client";

import { useState, useEffect } from "react";
import { WeeklySummary } from "./WeeklySummary";
import { MonthlyCost } from "./MonthlyCost";
import { ProviderFilter, type ProviderFilterValue } from "@/components/shared/ProviderFilter";

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

interface WeeklySummaryData {
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
}

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

interface MonthlyCostData {
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
}

interface ReportsData {
  weeklySummary: WeeklySummaryData;
  monthlyCost: MonthlyCostData;
}

interface ReportsPageContentProps {
  initialData: ReportsData;
  distinctProviders: string[];
}

export function ReportsPageContent({ initialData, distinctProviders }: ReportsPageContentProps) {
  const [provider, setProvider] = useState<ProviderFilterValue>("all");
  const [data, setData] = useState<ReportsData>(initialData);
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
        const res = await fetch(`/api/v1/reports?provider=${provider}`);
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (error) {
        console.error("Failed to fetch reports data:", error);
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
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Weekly and monthly summaries of AI tool usage
          </p>
        </div>
        {showProviderFilter && (
          <ProviderFilter value={provider} onChange={setProvider} />
        )}
      </div>

      <div className={loading ? "opacity-50 pointer-events-none" : ""}>
        {/* Weekly Summary */}
        <WeeklySummary data={data.weeklySummary} />

        {/* Monthly Cost Report */}
        <div className="mt-6">
          <MonthlyCost data={data.monthlyCost} />
        </div>
      </div>
    </div>
  );
}
