"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface Developer {
  alias: string;
  taskCount: number;
  lastActive: string;
}

interface DeveloperRosterProps {
  workspaceId: string;
}

export function DeveloperRoster({ workspaceId }: DeveloperRosterProps) {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDevelopers() {
      try {
        const response = await fetch("/api/v1/developers");
        if (response.ok) {
          const data = await response.json();
          setDevelopers(data.developers || []);
        }
      } catch (error) {
        console.error("Failed to fetch developers:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDevelopers();
  }, [workspaceId]);

  const getInitials = (name: string) => {
    return name
      .split(/[\s_-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Developer Roster
        </CardTitle>
        <CardDescription>
          Developers who have synced tasks to this workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : developers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No developers have synced tasks yet.
            <br />
            <span className="text-sm">
              Have your team run <code className="rounded bg-muted px-1">codeusage init</code>
            </span>
          </p>
        ) : (
          <div className="space-y-3">
            {developers.map((dev) => (
              <div
                key={dev.alias}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(dev.alias)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{dev.alias}</p>
                    <p className="text-sm text-muted-foreground">
                      Last active: {new Date(dev.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{dev.taskCount} tasks</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
