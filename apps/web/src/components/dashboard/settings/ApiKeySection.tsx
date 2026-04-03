"use client";

import { useState } from "react";
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
  hasExistingKey?: boolean; // Whether an API key already exists in DB
}

export function ApiKeySection({ hasExistingKey = false }: ApiKeySectionProps) {
  // API key is only shown after rotation (never stored)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyExistsInDb, setKeyExistsInDb] = useState(hasExistingKey);
  const [isRotating, setIsRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const response = await fetch("/api/v1/workspaces/rotate-key", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.api_key);
        setKeyExistsInDb(true);
        setDialogOpen(false); // Close dialog on success
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
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 flex-1 overflow-hidden">
            <Key className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm text-muted-foreground truncate">
              {apiKey ? apiKey : (keyExistsInDb ? "cu-ws-••••••••••••••••••••" : "No key generated")}
            </span>
          </div>
          {apiKey && (
            <Button
              variant="outline"
              onClick={handleCopy}
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
          )}
        </div>

        {keyExistsInDb && !apiKey && (
          <p className="text-xs text-muted-foreground">
            Rotating will generate a new API key and invalidate the current one. All team members will need to run <code className="rounded bg-muted px-1">codeusage init</code> with the new key.
          </p>
        )}


        {/* Show confirmation dialog only when rotating an existing key */}
        {keyExistsInDb ? (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger
              disabled={isRotating}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
              Rotate Key
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will invalidate the current API key. All developers will need to
                  re-run <code className="rounded bg-muted px-1">codeusage init</code> with
                  the new key.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRotate}>
                  Rotate Key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            variant="outline"
            onClick={handleRotate}
            disabled={isRotating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
            Generate Key
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
