"use client";

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
  value: ProviderFilterValue;
  onChange: (value: ProviderFilterValue) => void;
}

export function ProviderFilter({ value, onChange }: ProviderFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProviderFilterValue)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Providers</SelectItem>
        {Object.values(PROVIDERS).map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            {provider.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
