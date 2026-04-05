"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock, FolderKanban } from "lucide-react";
import { ProviderIndicator } from "@/components/shared/ProviderBadge";

interface ProjectProfileHeaderProps {
  projectSlug: string;
  firstTask: string | null;
  lastTask: string | null;
  providers: string[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  // Parse the date - PostgreSQL returns UTC timestamps
  // Ensure we treat the date string as UTC if it doesn't have timezone info
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const now = new Date();

  // Compare by UTC calendar date to avoid timezone issues
  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((nowUTC - dateUTC) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function ProjectProfileHeader({
  projectSlug,
  firstTask,
  lastTask,
  providers,
}: ProjectProfileHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back Link */}
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Profile Header */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FolderKanban className="h-8 w-8" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{projectSlug}</h1>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            {/* First Task */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Started {formatDate(firstTask)}</span>
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
