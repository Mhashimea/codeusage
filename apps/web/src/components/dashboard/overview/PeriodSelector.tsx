"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId } from "react";
import type { Period } from "@/lib/period";

export type { Period };

interface PeriodSelectorProps {
  defaultPeriod?: Period;
}

const periodLabels: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "this_month": "This month",
};

export function PeriodSelector({ defaultPeriod = "30d" }: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerId = useId();

  const currentPeriod = (searchParams.get("period") as Period) || defaultPeriod;

  const handlePeriodChange = useCallback(
    (value: Period) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", value);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger id={triggerId} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
        {periodLabels[currentPeriod]}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handlePeriodChange("7d")}
          className={currentPeriod === "7d" ? "bg-accent" : ""}
        >
          {periodLabels["7d"]}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlePeriodChange("30d")}
          className={currentPeriod === "30d" ? "bg-accent" : ""}
        >
          {periodLabels["30d"]}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlePeriodChange("this_month")}
          className={currentPeriod === "this_month" ? "bg-accent" : ""}
        >
          {periodLabels["this_month"]}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

