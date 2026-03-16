"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil } from "lucide-react";
import type { Workspace } from "@/lib/db/schema";

interface WorkspaceConfigProps {
  workspace: Workspace;
}

export function WorkspaceConfig({ workspace }: WorkspaceConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/v1/workspaces/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update workspace:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const planBadgeVariant = workspace.plan === "free" ? "secondary" : "default";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>
          Your workspace settings and plan information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || name === workspace.name}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setName(workspace.name);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-lg font-medium">{workspace.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plan</Label>
          <div className="flex items-center gap-2">
            <Badge variant={planBadgeVariant} className="capitalize">
              {workspace.plan}
            </Badge>
            {workspace.plan === "free" && (
              <span className="text-sm text-muted-foreground">
                Upgrade to unlock more features
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Created</Label>
          <p className="text-sm text-muted-foreground">
            {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
