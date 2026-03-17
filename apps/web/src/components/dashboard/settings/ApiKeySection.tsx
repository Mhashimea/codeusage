"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check, Key } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ApiKeySectionProps {
  workspaceId: string;
}

const STORAGE_KEY = "afterburn_api_key";

export function ApiKeySection({ workspaceId }: ApiKeySectionProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(`${STORAGE_KEY}_${workspaceId}`);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, [workspaceId]);

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const response = await fetch("/api/v1/workspaces/rotate-key", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.api_key);
        // Store in localStorage for future access
        localStorage.setItem(`${STORAGE_KEY}_${workspaceId}`, data.api_key);
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopy = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Use this key to authenticate the CLI with your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 flex-1">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {apiKey ? "ab-ws-••••••••••••" : "No key generated"}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!apiKey}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            disabled={isRotating}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
            {apiKey ? "Rotate Key" : "Generate Key"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {apiKey ? "Rotate API Key?" : "Generate API Key?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {apiKey ? (
                  <>
                    This will invalidate the current API key. All developers will need to
                    re-run <code className="rounded bg-muted px-1">afterburn init</code> with
                    the new key.
                  </>
                ) : (
                  "Generate a new API key to connect the CLI to this workspace."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRotate}>
                {apiKey ? "Rotate Key" : "Generate Key"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
