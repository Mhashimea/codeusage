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
import { X } from "lucide-react";
import { getAllProviders } from "@afterburn/shared";

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

  const hasFilters = currentDeveloper || currentProject || currentProvider;

  return (
    <div className="flex items-center gap-4">
      <Select
        value={currentDeveloper || "all"}
        onValueChange={(value) => updateFilter("developer", value ?? "all")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All developers" />
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

      <Select
        value={currentProject || "all"}
        onValueChange={(value) => updateFilter("project", value ?? "all")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All projects" />
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

      <Select
        value={currentProvider || "all"}
        onValueChange={(value) => updateFilter("provider", value ?? "all")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All providers" />
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

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
