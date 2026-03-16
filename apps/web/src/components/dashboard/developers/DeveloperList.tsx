"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTokens } from "@afterburn/shared";

interface Developer {
  alias: string;
  taskCount: number;
  lastActive: string;
  totalTokens: number;
  totalCost: number;
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

function formatLastActive(dateStr: string): string {
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
            <div className="space-y-4">
              {activeDevelopers.map((dev) => (
                <div
                  key={dev.alias}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {dev.alias.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{dev.alias}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatLastActive(dev.lastActive)}
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
                      <p className="font-medium">{formatTokens(dev.totalTokens)}</p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium text-green-500">
                        {formatCost(dev.totalCost)}
                      </p>
                      <p className="text-xs text-muted-foreground">cost</p>
                    </div>
                  </div>
                </div>
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
            <div className="space-y-4">
              {inactiveDevelopers.map((dev) => (
                <div
                  key={dev.alias}
                  className="flex items-center justify-between rounded-lg border border-border p-4 opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold">
                      {dev.alias.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{dev.alias}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatLastActive(dev.lastActive)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="w-32" />

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">{dev.taskCount}</p>
                      <p className="text-xs text-muted-foreground">tasks</p>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <p className="font-medium">{formatTokens(dev.totalTokens)}</p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium text-green-500">
                        {formatCost(dev.totalCost)}
                      </p>
                      <p className="text-xs text-muted-foreground">cost</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
