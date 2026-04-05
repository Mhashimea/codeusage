"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokens } from "@codeusage/shared";
import { FolderKanban } from "lucide-react";
import Link from "next/link";

interface Project {
  project_slug: string;
  task_count: number;
  total_cost: number;
  total_tokens: number;
  last_activity: string;
}

interface DeveloperProjectsBreakdownProps {
  projects: Project[];
}

function formatLastActivity(dateStr: string): string {
  // Parse the date - PostgreSQL returns UTC timestamps
  // Ensure we treat the date string as UTC if it doesn't have timezone info
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const now = new Date();

  // Compare by UTC calendar date to avoid timezone issues
  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((nowUTC - dateUTC) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Active today";
  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)}w ago`;
  return `Active ${Math.floor(diffDays / 30)}mo ago`;
}

export function DeveloperProjectsBreakdown({ projects }: DeveloperProjectsBreakdownProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No projects yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max tokens for progress bar
  const maxTokens = Math.max(...projects.map((p) => p.total_tokens));

  const totalTokens = projects.reduce((sum, p) => sum + p.total_tokens, 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Projects</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
          {" · "}
          <span className="text-blue-400">{formatTokens(totalTokens)}</span> tokens
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[400px] overflow-y-auto pr-2 -mr-2 space-y-3">
          {projects.map((project) => {
            const progressWidth = maxTokens > 0 ? (project.total_tokens / maxTokens) * 100 : 0;

            return (
              <Link
                key={project.project_slug}
                href={`/app/projects?project=${encodeURIComponent(project.project_slug)}`}
                className="block"
              >
                <div className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <FolderKanban className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{project.project_slug}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.task_count} tasks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-400 text-sm">
                        {formatTokens(project.total_tokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatLastActivity(project.last_activity)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/50 rounded-full transition-all"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
