"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDERS, type ProviderId } from "@codeusage/shared";

export type ProviderFilterValue = ProviderId | "all";

interface ProviderFilterProps {
  /** List of provider IDs to show in the dropdown. If not provided, shows all providers */
  providers?: string[];
}

export function ProviderFilter({ providers }: ProviderFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProvider = searchParams.get("provider") || "all";

  // Use provided providers list or all providers
  const providerList = providers ?? Object.keys(PROVIDERS);

  const updateProvider = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set("provider", value);
      } else {
        params.delete("provider");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Only show if there are multiple providers
  if (providerList.length <= 1) {
    return null;
  }

  return (
    <Select value={currentProvider} onValueChange={updateProvider}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select provider">
          {currentProvider === "all"
            ? "All Providers"
            : PROVIDERS[currentProvider as ProviderId]?.displayName || currentProvider}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Providers</SelectItem>
        {providerList.map((providerId) => {
          const provider = PROVIDERS[providerId as ProviderId];
          return (
            <SelectItem key={providerId} value={providerId}>
              {provider?.displayName || providerId}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
