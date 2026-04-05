"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Loader2, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { CodeusageLogoBrand } from "@/components/shared/CodeusageLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

type PageState = "loading" | "expired" | "no-workspace" | "select" | "connecting" | "success" | "error";

function CliConnectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const port = searchParams.get("port");
  const expiresParam = searchParams.get("expires");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Check expiry
  useEffect(() => {
    if (!expiresParam) {
      setPageState("expired");
      return;
    }

    const expiresAt = parseInt(expiresParam, 10) * 1000;
    const now = Date.now();

    if (now >= expiresAt) {
      setPageState("expired");
      return;
    }

    // Calculate remaining time
    const remaining = Math.floor((expiresAt - now) / 1000);
    setCountdown(remaining);

    // Update countdown every second
    const timer = setInterval(() => {
      const newRemaining = Math.floor((expiresAt - Date.now()) / 1000);
      if (newRemaining <= 0) {
        setPageState("expired");
        clearInterval(timer);
      } else {
        setCountdown(newRemaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresParam]);

  // Check auth and fetch workspaces
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      // Redirect to login with callback
      const callbackUrl = `/cli/connect?port=${port}&expires=${expiresParam}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status, port, expiresParam, router]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/v1/workspaces");
      const data = await response.json();

      if (response.ok && data.workspaces?.length > 0) {
        setWorkspaces(data.workspaces);
        setSelectedWorkspaceId(data.workspaces[0].id);
        setPageState("select");
      } else {
        setPageState("no-workspace");
      }
    } catch {
      setError("Failed to load workspaces");
      setPageState("error");
    }
  };

  const handleConnect = async () => {
    if (!port || !selectedWorkspaceId) return;

    setPageState("connecting");

    try {
      // Fetch the API key for the selected workspace
      const response = await fetch("/api/v1/cli/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: selectedWorkspaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to get workspace credentials");
        setPageState("error");
        return;
      }

      // Send callback to CLI
      const callbackResponse = await fetch(`http://localhost:${port}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_key: data.workspace_key,
          workspace_name: data.workspace_name,
        }),
      });

      if (callbackResponse.ok) {
        setPageState("success");
      } else {
        setError("Failed to connect to CLI. Make sure the terminal is still open.");
        setPageState("error");
      }
    } catch {
      setError("Failed to connect to CLI. Make sure the terminal is still open.");
      setPageState("error");
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  // Loading state
  if (pageState === "loading" || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CodeusageLogoBrand size={48} />
          </div>

          {pageState === "expired" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Link Expired</CardTitle>
              <CardDescription>
                This link has expired. Please run <code className="bg-muted px-1 rounded">codeusage init</code> again.
              </CardDescription>
            </>
          )}

          {pageState === "no-workspace" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">No Workspace</CardTitle>
              <CardDescription>
                You need to create a workspace first before connecting the CLI.
              </CardDescription>
            </>
          )}

          {pageState === "select" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D97757]/10">
                <Terminal className="h-6 w-6 text-[#D97757]" />
              </div>
              <CardTitle className="text-2xl">Connect your CLI</CardTitle>
              <CardDescription>
                Select a workspace to connect to your CLI
              </CardDescription>
            </>
          )}

          {pageState === "connecting" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D97757]/10">
                <Loader2 className="h-6 w-6 animate-spin text-[#D97757]" />
              </div>
              <CardTitle className="text-2xl">Connecting...</CardTitle>
              <CardDescription>
                Sending credentials to your CLI
              </CardDescription>
            </>
          )}

          {pageState === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Connected!</CardTitle>
              <CardDescription>
                Your CLI is now connected. You can close this tab.
              </CardDescription>
            </>
          )}

          {pageState === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Connection Failed</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {pageState === "expired" && (
            <Button variant="outline" className="w-full" onClick={() => window.close()}>
              Close
            </Button>
          )}

          {pageState === "no-workspace" && (
            <Button className="w-full bg-[#D97757] hover:bg-[#c5684a]" onClick={() => router.push("/workspace/create")}>
              Create Workspace
            </Button>
          )}

          {pageState === "select" && (
            <>
              {workspaces.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workspace</label>
                  <Select value={selectedWorkspaceId} onValueChange={(value) => value && setSelectedWorkspaceId(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          <span className="flex items-center gap-2">
                            {ws.name}
                            <span className="text-xs text-muted-foreground capitalize">({ws.role})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedWorkspace?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">({selectedWorkspace?.role})</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expires in {formatCountdown(countdown)}</span>
              </div>

              <Button className="w-full bg-[#D97757] hover:bg-[#c5684a]" onClick={handleConnect}>
                Connect CLI
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Your CLI will receive the workspace API key and complete setup automatically.
              </p>
            </>
          )}

          {pageState === "error" && (
            <Button variant="outline" className="w-full" onClick={() => setPageState("select")}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CliConnectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CliConnectContent />
    </Suspense>
  );
}
