"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ArrowRight, Building2, Loader2 } from "lucide-react";

export default function CreateWorkspacePage() {
  const [step, setStep] = useState<"name" | "apikey">("name");
  const [workspaceName, setWorkspaceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/v1/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create workspace");
        return;
      }

      // Show the API key (displayed once, not stored)
      setApiKey(data.apiKey);
      setStep("apikey");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    setIsContinuing(true);
    // Session cookie was already set by the workspace creation endpoint
    // Simply navigate to the app
    window.location.href = "/app";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {step === "name" ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create your workspace</CardTitle>
              <CardDescription>
                A workspace is where your team tracks AI coding activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="e.g. Acme Engineering"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={isCreating}
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create workspace"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl">Workspace created!</CardTitle>
              <CardDescription>
                Copy your API key now — it won't be shown again
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={apiKey}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll need this key to set up the CLI on your machine
                </p>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Next steps:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy your API key above</li>
                  <li>Install the CLI: <code className="bg-background px-1 rounded">bun add -g codeusage-cli</code></li>
                  <li>Run <code className="bg-background px-1 rounded">codeusage init</code> and paste your key</li>
                </ol>
              </div>

              <Button onClick={handleContinue} className="w-full" disabled={isContinuing}>
                {isContinuing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Continue to dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
