"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
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

export function ApiKeySection() {
  const [isRotating, setIsRotating] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const response = await fetch("/api/v1/workspaces/rotate-key", {
        method: "POST",
      });

      if (response.ok) {
        setRotated(true);
        setDialogOpen(false);
        setTimeout(() => setRotated(false), 3000);
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Rotate the workspace API key if it has been compromised. All team members will need to reconnect their CLI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={isRotating}
              className="gap-2"
            >
              {rotated ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Key Rotated
                </>
              ) : (
                <>
                  <RefreshCw className={`h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
                  Rotate API Key
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will generate a new API key and invalidate the current one. All team members will need to run <code className="rounded bg-muted px-1">codeusage init --force</code> to reconnect.
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
