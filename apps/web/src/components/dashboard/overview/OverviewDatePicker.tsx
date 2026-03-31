"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format, parse, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewDatePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  const defaultStartDate = format(thirtyDaysAgo, "yyyy-MM-dd");
  const defaultEndDate = format(today, "yyyy-MM-dd");

  const startDateParam = searchParams.get("startDate") || defaultStartDate;
  const endDateParam = searchParams.get("endDate") || defaultEndDate;

  // Parse date range from URL params
  const dateRange = useMemo<DateRange | undefined>(() => {
    try {
      const from = parse(startDateParam, "yyyy-MM-dd", new Date());
      const to = parse(endDateParam, "yyyy-MM-dd", new Date());
      return { from, to };
    } catch {
      return { from: thirtyDaysAgo, to: today };
    }
  }, [startDateParam, endDateParam]);

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
      router.push(`/app?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
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
            <span>Last 30 days</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
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
  );
}
