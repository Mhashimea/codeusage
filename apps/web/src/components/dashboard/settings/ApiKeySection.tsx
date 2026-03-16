"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RefreshCw, Check, AlertTriangle } from "lucide-react";
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

export function ApiKeySection({ workspaceId }: ApiKeySectionProps) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedKey = "ab-ws-••••••••••••••••••••••••••••••••";

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const response = await fetch("/api/v1/workspaces/rotate-key", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setNewKey(data.api_key);
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
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
          The key is shown only once after generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={newKey || maskedKey}
            className="font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!newKey}
            title={newKey ? "Copy to clipboard" : "Generate new key to copy"}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {newKey && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">Save this key now!</p>
                <p className="text-muted-foreground">
                  This is the only time you will see this key. Copy it before leaving this page.
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialog>
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
                re-run <code className="rounded bg-muted px-1">afterburn init</code> with
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
      </CardContent>
    </Card>
  );
}
