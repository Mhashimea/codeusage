"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Calendar } from "lucide-react";
import { getAllProviders } from "@afterburn/shared";

interface TaskFiltersProps {
  developers: string[];
  projects: string[];
  providers?: string[];
}

const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function TaskFilters({ developers, projects, providers = [] }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDeveloper = searchParams.get("developer") || "";
  const currentProject = searchParams.get("project") || "";
  const currentProvider = searchParams.get("provider") || "";
  const currentDateRange = searchParams.get("date") || "";

  // Get provider display names
  const allProviders = getAllProviders();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change
      params.delete("page");
      router.push(`/tasks?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/tasks");
  }, [router]);

  const hasFilters = currentDeveloper || currentProject || currentProvider || currentDateRange;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Filter */}
      <Select
        value={currentDateRange || "all"}
        onValueChange={(value) => updateFilter("date", value ?? "all")}
      >
        <SelectTrigger className="w-[160px]">
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue>
            {DATE_RANGES.find((r) => r.value === (currentDateRange || "all"))?.label || "All time"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Developer Filter */}
      <Select
        value={currentDeveloper || "all"}
        onValueChange={(value) => updateFilter("developer", value ?? "all")}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {currentDeveloper || "All developers"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All developers</SelectItem>
          {developers.map((dev) => (
            <SelectItem key={dev} value={dev}>
              {dev}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project Filter */}
      <Select
        value={currentProject || "all"}
        onValueChange={(value) => updateFilter("project", value ?? "all")}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {currentProject || "All projects"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((proj) => (
            <SelectItem key={proj} value={proj}>
              {proj}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Provider Filter - only show if there are multiple providers */}
      {providers.length > 1 && (
        <Select
          value={currentProvider || "all"}
          onValueChange={(value) => updateFilter("provider", value ?? "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {currentProvider
                ? allProviders.find((p) => p.id === currentProvider)?.displayName || currentProvider
                : "All providers"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((providerId) => {
              const providerInfo = allProviders.find((p) => p.id === providerId);
              return (
                <SelectItem key={providerId} value={providerId}>
                  {providerInfo?.displayName || providerId}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
