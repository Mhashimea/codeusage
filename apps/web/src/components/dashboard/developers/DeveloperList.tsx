"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderIndicator } from "@/components/shared/ProviderBadge";
import { ChevronRight } from "lucide-react";
import { formatTokens } from "@codeusage/shared";

interface Developer {
  alias: string;
  taskCount: number;
  lastActive: string;
  totalTokens: number;
  totalCost: number;
  providers: string[];
  projectCount: number;
}

interface DeveloperListProps {
  developers: Developer[];
  activity: Record<string, Record<string, number>>;
}

function ActivityBar({ activity, days = 14 }: { activity: Record<string, number>; days?: number }) {
  const today = new Date();
  const bars = [];

  let maxCount = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = activity[dateStr] || 0;
    if (count > maxCount) maxCount = count;
  }

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = activity[dateStr] || 0;
    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

    bars.push(
      <div
        key={dateStr}
        className="flex-1 flex items-end h-6"
        title={`${dateStr}: ${count} tasks`}
      >
        <div
          className="w-full bg-primary/80 rounded-sm min-h-[2px]"
          style={{ height: `${Math.max(height, count > 0 ? 15 : 0)}%` }}
        />
      </div>
    );
  }

  return <div className="flex gap-0.5 w-32">{bars}</div>;
}

export function DeveloperList({ developers, activity }: DeveloperListProps) {
  if (developers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Developers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No developers yet. Connect the CLI to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate active and inactive developers
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const activeDevelopers = developers.filter(
    (d) => new Date(d.lastActive) >= fourteenDaysAgo
  );
  const inactiveDevelopers = developers.filter(
    (d) => new Date(d.lastActive) < fourteenDaysAgo
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Developers</CardTitle>
        </CardHeader>
        <CardContent>
          {activeDevelopers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No active developers in the last 14 days.
            </p>
          ) : (
            <div className="space-y-3">
              {activeDevelopers.map((dev) => (
                <Link
                  key={dev.alias}
                  href={`/app/developers/${encodeURIComponent(dev.alias)}`}
                  className="group flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold group-hover:bg-primary/20 transition-colors">
                      {dev.alias.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium group-hover:text-primary transition-colors">{dev.alias}</p>
                        {dev.providers.map((p) => (
                          <ProviderIndicator key={p} providerId={p} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dev.projectCount} {dev.projectCount === 1 ? "project" : "projects"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <ActivityBar activity={activity[dev.alias] || {}} />

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">{dev.taskCount}</p>
                      <p className="text-xs text-muted-foreground">tasks</p>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <p className="font-medium text-blue-400">{formatTokens(dev.totalTokens)}</p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inactiveDevelopers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Inactive Developers
              <Badge variant="secondary">{inactiveDevelopers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveDevelopers.map((dev) => (
                <Link
                  key={dev.alias}
                  href={`/app/developers/${encodeURIComponent(dev.alias)}`}
                  className="group flex items-center justify-between rounded-lg border border-border p-4 opacity-60 hover:bg-muted/50 hover:border-muted-foreground/50 hover:opacity-80 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold">
                      {dev.alias.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium group-hover:text-foreground transition-colors">{dev.alias}</p>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="w-32" />

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">{dev.taskCount}</p>
                      <p className="text-xs text-muted-foreground">tasks</p>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <p className="font-medium text-blue-400">{formatTokens(dev.totalTokens)}</p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
