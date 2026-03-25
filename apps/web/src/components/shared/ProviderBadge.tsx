"use client";

import { PROVIDERS, type ProviderId } from "@codeusage/shared";
import { cn } from "@/lib/utils";

interface ProviderBadgeProps {
  providerId: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * Provider icon component
 */
function ProviderIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  // Simple text-based icons for now
  // Can be replaced with actual SVG icons later
  switch (id) {
    case "claude_code":
      return (
        <span className={cn("font-bold text-orange-500", className)}>C</span>
      );
    case "codex":
      return (
        <span className={cn("font-bold text-green-500", className)}>O</span>
      );
    default:
      return (
        <span className={cn("font-bold text-gray-500", className)}>?</span>
      );
  }
}

/**
 * Badge displaying the AI coding tool provider
 */
export function ProviderBadge({
  providerId,
  showLabel = true,
  className,
}: ProviderBadgeProps) {
  const provider = PROVIDERS[providerId as ProviderId];

  if (!provider) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground",
          className
        )}
      >
        <ProviderIcon id={providerId} className="text-[10px]" />
        {showLabel && <span>{providerId}</span>}
      </span>
    );
  }

  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    coming_soon: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    beta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs",
        statusColors[provider.status],
        className
      )}
    >
      <ProviderIcon id={providerId} className="text-[10px]" />
      {showLabel && <span>{provider.displayName}</span>}
      {provider.status === "coming_soon" && (
        <span className="text-[10px] opacity-70">(Soon)</span>
      )}
    </span>
  );
}

/**
 * Compact provider indicator (just the icon)
 */
export function ProviderIndicator({
  providerId,
  className,
}: {
  providerId: string;
  className?: string;
}) {
  return <ProviderBadge providerId={providerId} showLabel={false} className={className} />;
}
