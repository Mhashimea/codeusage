"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format, parse } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { getAllProviders } from "@afterburn/shared";
import { cn } from "@/lib/utils";

interface TaskFiltersProps {
  developers: string[];
  projects: string[];
  providers?: string[];
}

export function TaskFilters({ developers, projects, providers = [] }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDeveloper = searchParams.get("developer") || "";
  const currentProject = searchParams.get("project") || "";
  const currentProvider = searchParams.get("provider") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  // Get provider display names
  const allProviders = getAllProviders();

  // Parse date range from URL params
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!startDateParam) return undefined;
    try {
      const from = parse(startDateParam, "yyyy-MM-dd", new Date());
      const to = endDateParam ? parse(endDateParam, "yyyy-MM-dd", new Date()) : from;
      return { from, to };
    } catch {
      return undefined;
    }
  }, [startDateParam, endDateParam]);

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

  const updateDateRange = useCallback(
    (range: DateRange | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (range?.from) {
        params.set("startDate", format(range.from, "yyyy-MM-dd"));
        if (range.to) {
          params.set("endDate", format(range.to, "yyyy-MM-dd"));
        } else {
          params.delete("endDate");
        }
      } else {
        params.delete("startDate");
        params.delete("endDate");
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

  const hasFilters = currentDeveloper || currentProject || currentProvider || startDateParam;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>All time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={updateDateRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

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
