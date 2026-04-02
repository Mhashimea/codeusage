"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Users, AlertCircle, Loader2 } from "lucide-react";

interface InvitationDetails {
  workspaceName: string;
  inviterName: string;
  role: string;
  email: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  // For new users
  const [name, setName] = useState("");

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/v1/invitations/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invalid or expired invitation");
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError("");

    try {
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      // Redirect to login if not logged in, or to app if logged in
      if (data.requiresLogin) {
        router.push(`/login?email=${encodeURIComponent(invitation?.email || "")}&next=/app`);
      } else {
        router.push("/app");
        router.refresh();
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoggedIn = status === "authenticated";
  const isCorrectUser = isLoggedIn && session?.user?.email?.toLowerCase() === invitation?.email?.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're invited!</CardTitle>
          <CardDescription>
            {invitation?.inviterName || "Someone"} invited you to join{" "}
            <span className="font-medium text-foreground">{invitation?.workspaceName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{invitation?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>You'll join as: <span className="font-medium capitalize">{invitation?.role}</span></span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!isLoggedIn && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button onClick={handleAccept} className="w-full" disabled={accepting}>
                {accepting ? "Creating account..." : "Create account & join"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll receive a magic link to verify your email
              </p>
            </div>
          )}

          {isLoggedIn && isCorrectUser && (
            <Button onClick={handleAccept} className="w-full" disabled={accepting}>
              {accepting ? "Joining..." : "Join workspace"}
            </Button>
          )}

          {isLoggedIn && !isCorrectUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You're logged in as {session?.user?.email}. This invitation is for {invitation?.email}.
              </p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
                Sign in with different account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
