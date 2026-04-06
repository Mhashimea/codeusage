"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Merge } from "lucide-react";

interface Developer {
  alias: string;
  taskCount: number;
  lastActive: string;
}

interface DeveloperRosterProps {
  workspaceId: string;
  userRole?: string;
}

export function DeveloperRoster({ workspaceId, userRole }: DeveloperRosterProps) {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [fromAlias, setFromAlias] = useState("");
  const [toAlias, setToAlias] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<string | null>(null);

  const canMerge = userRole === "owner" || userRole === "admin";

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

  useEffect(() => {
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

  const handleMerge = async () => {
    if (!fromAlias || !toAlias || fromAlias === toAlias) return;

    setIsMerging(true);
    setMergeResult(null);

    try {
      const response = await fetch("/api/v1/developers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAlias, toAlias }),
      });

      const data = await response.json();

      if (response.ok) {
        setMergeResult(`Merged ${data.updatedCount} tasks from "${fromAlias}" into "${toAlias}"`);
        setFromAlias("");
        setToAlias("");
        setShowMergeDialog(false);
        // Refresh the developer list
        setIsLoading(true);
        await fetchDevelopers();
      } else {
        setMergeResult(`Error: ${data.error}`);
      }
    } catch {
      setMergeResult("Error: Failed to merge developers");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Developer Roster
              </CardTitle>
              <CardDescription>
                Developers who have synced tasks to this workspace
              </CardDescription>
            </div>
            {canMerge && developers.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMergeDialog(true)}
              >
                <Merge className="mr-2 h-4 w-4" />
                Merge
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mergeResult && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              mergeResult.startsWith("Error")
                ? "bg-destructive/10 text-destructive"
                : "bg-green-500/10 text-green-500"
            }`}>
              {mergeResult}
            </div>
          )}

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

      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Developers</AlertDialogTitle>
            <AlertDialogDescription>
              All tasks from the source developer will be reassigned to the target developer. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source (will be removed)</label>
              <Select value={fromAlias} onValueChange={(v) => v && setFromAlias(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select developer to merge from" />
                </SelectTrigger>
                <SelectContent>
                  {developers
                    .filter((d) => d.alias !== toAlias)
                    .map((dev) => (
                      <SelectItem key={dev.alias} value={dev.alias}>
                        {dev.alias} ({dev.taskCount} tasks)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target (will keep)</label>
              <Select value={toAlias} onValueChange={(v) => v && setToAlias(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select developer to merge into" />
                </SelectTrigger>
                <SelectContent>
                  {developers
                    .filter((d) => d.alias !== fromAlias)
                    .map((dev) => (
                      <SelectItem key={dev.alias} value={dev.alias}>
                        {dev.alias} ({dev.taskCount} tasks)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={!fromAlias || !toAlias || fromAlias === toAlias || isMerging}
            >
              {isMerging ? "Merging..." : "Merge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
