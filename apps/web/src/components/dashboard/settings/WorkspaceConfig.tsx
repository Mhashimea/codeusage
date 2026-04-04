"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil, Building2, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Workspace, MemberRole } from "@/lib/db/schema";

interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceConfigProps {
  workspace: Workspace;
  userRole: MemberRole | null;
}

export function WorkspaceConfig({ workspace, userRole }: WorkspaceConfigProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [switching, setSwitching] = useState(false);

  const canEdit = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/v1/workspaces");
      const data = await response.json();
      if (response.ok) {
        setWorkspaces(data.workspaces);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === session?.user?.workspaceId) return;

    setSwitching(true);
    try {
      const response = await fetch("/api/v1/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (response.ok) {
        await update();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    } finally {
      setSwitching(false);
    }
  };

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
        {/* Workspace Switcher - only show if multiple workspaces */}
        {workspaces.length > 1 && (
          <div className="space-y-2">
            <Label>Switch Workspace</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full max-w-sm justify-between"
                  disabled={switching}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{workspace.name}</span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        ws.id === workspace.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{ws.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground capitalize">
                      {ws.role}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/workspace/create")}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
          <Label>Created</Label>
          <p className="text-sm text-muted-foreground">
            {new Date(workspace.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
