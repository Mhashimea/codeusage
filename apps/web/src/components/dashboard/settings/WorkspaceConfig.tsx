"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil } from "lucide-react";
import type { Workspace, MemberRole } from "@/lib/db/schema";

interface WorkspaceConfigProps {
  workspace: Workspace;
  userRole: MemberRole | null;
}

export function WorkspaceConfig({ workspace, userRole }: WorkspaceConfigProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = userRole === "owner" || userRole === "admin";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/v1/workspaces/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      });

      if (response.ok) {
        setIsEditing(false);
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
        <CardTitle>Workspace</CardTitle>
        <CardDescription>
          Manage your workspace settings
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
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  className="max-w-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || workspaceName === workspace.name || !workspaceName.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setWorkspaceName(workspace.name);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-lg font-medium">
                  {workspace.name}
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plan</Label>
          <p className="text-sm text-muted-foreground capitalize">{workspace.plan}</p>
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
