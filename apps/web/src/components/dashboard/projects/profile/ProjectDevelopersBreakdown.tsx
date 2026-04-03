"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokens } from "@codeusage/shared";
import { Users } from "lucide-react";
import Link from "next/link";

interface Developer {
  developer_alias: string;
  task_count: number;
  total_cost: number;
  total_tokens: number;
  last_activity: string;
}

interface ProjectDevelopersBreakdownProps {
  developers: Developer[];
}

function formatLastActivity(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function ProjectDevelopersBreakdown({ developers }: ProjectDevelopersBreakdownProps) {
  if (developers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Developers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No developers yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max tokens for progress bar
  const maxTokens = Math.max(...developers.map((d) => d.total_tokens));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Developers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {developers.map((developer) => {
            const progressWidth = maxTokens > 0 ? (developer.total_tokens / maxTokens) * 100 : 0;

            return (
              <Link
                key={developer.developer_alias}
                href={`/app/developers/${encodeURIComponent(developer.developer_alias)}`}
                className="block"
              >
                <div className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {developer.developer_alias.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{developer.developer_alias}</p>
                        <p className="text-xs text-muted-foreground">
                          {developer.task_count} tasks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-400 text-sm">
                        {formatTokens(developer.total_tokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatLastActivity(developer.last_activity)}
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
