"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { ProviderIndicator } from "@/components/shared/ProviderBadge";

interface DeveloperProfileHeaderProps {
  alias: string;
  firstTask: string | null;
  lastTask: string | null;
  providers: string[];
}

function formatMemberSince(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function DeveloperProfileHeader({
  alias,
  firstTask,
  lastTask,
  providers,
}: DeveloperProfileHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back Link */}
      <Link
        href="/app/developers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Developers
      </Link>

      {/* Profile Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
          {alias.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{alias}</h1>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            {/* Member Since */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Member since {formatMemberSince(firstTask)}</span>
            </div>

            {/* Last Active */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last active {formatLastActive(lastTask)}</span>
            </div>
          </div>

          {/* Provider Badges */}
          {providers.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {providers.map((provider) => (
                <ProviderIndicator key={provider} providerId={provider} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
