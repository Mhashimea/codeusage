"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil } from "lucide-react";
import type { Workspace } from "@/lib/db/schema";

interface WorkspaceConfigProps {
  workspace: Workspace;
}

export function WorkspaceConfig({ workspace }: WorkspaceConfigProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(workspace.display_name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/v1/workspaces/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      if (response.ok) {
        setIsEditing(false);
        // Refresh the page to update session data
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update workspace:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your profile and workspace settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="max-w-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || displayName === (workspace.display_name || "")}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(workspace.display_name || "");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-lg font-medium">
                  {workspace.display_name || "Not set"}
                </span>
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
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{workspace.name}</p>
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
