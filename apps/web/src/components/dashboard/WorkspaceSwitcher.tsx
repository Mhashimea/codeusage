"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

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
    } finally {
      setLoading(false);
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

  const currentWorkspace = workspaces.find(
    (w) => w.id === session?.user?.workspaceId
  );

  if (loading) {
    return (
      <div className="mx-3 mb-2 h-10 animate-pulse rounded-md bg-muted" />
    );
  }

  // Only show switcher if user has multiple workspaces
  if (workspaces.length <= 1) {
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">
          {currentWorkspace?.name || "Workspace"}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between bg-muted/50 border-border"
              disabled={switching}
            />
          }
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {currentWorkspace?.name || "Select workspace"}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleSwitchWorkspace(workspace.id)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  workspace.id === session?.user?.workspaceId
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              <span className="flex-1 truncate">{workspace.name}</span>
              <span className="ml-2 text-xs text-muted-foreground capitalize">
                {workspace.role}
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
  );
}
