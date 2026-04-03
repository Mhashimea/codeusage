"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Users, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

interface InvitationDetails {
  workspaceName: string;
  inviterName: string;
  role: string;
  email: string;
}

type Step = "loading" | "details" | "otp" | "login-required";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [step, setStep] = useState<Step>("loading");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // For new users
  const [name, setName] = useState("");

  // For OTP verification
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch invitation details on mount
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/v1/invitations/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invalid or expired invitation");
          setStep("details");
          return;
        }

        setInvitation(data.invitation);
        setStep("details");
      } catch {
        setError("Failed to load invitation");
        setStep("details");
      }
    }

    fetchInvitation();
  }, [token]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      otpInputsRef.current[0]?.focus();
    }
  }, [step]);

  // Handle sending OTP for new users
  const handleSendOtp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/invitations/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send verification code");
        return;
      }

      if (data.userExists) {
        // User exists - they need to login
        setStep("login-required");
        return;
      }

      // OTP sent successfully
      setStep("otp");
      setCountdown(60);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resending OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/invitations/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send verification code");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setCountdown(60);
      otpInputsRef.current[0]?.focus();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification and acceptance (for new users)
  const handleVerifyOtp = async (otpValue: string) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/invitations/verify-and-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          otp: otpValue,
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }

      // Success - redirect to app
      router.push("/app");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle acceptance for logged-in users
  const handleAcceptLoggedIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      // Success - redirect to app
      router.push("/app");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const otpValue = newOtp.join("");
      if (otpValue.length === 6) {
        handleVerifyOtp(otpValue);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      handleVerifyOtp(pastedData);
    }
  };

  const handleBackToDetails = () => {
    setStep("details");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleGoToLogin = async () => {
    // Sign out first if logged in, then redirect to login with invite params
    const loginUrl = `/login?email=${encodeURIComponent(invitation?.email || "")}&inviteToken=${token}`;
    if (status === "authenticated") {
      await signOut({ redirect: false });
    }
    router.push(loginUrl);
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid invitation
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
        {/* OTP Step */}
        {step === "otp" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification code to {invitation?.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="space-y-4">
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { otpInputsRef.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-12 text-center text-xl font-semibold"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn&apos;t receive the code?{" "}
                    {countdown > 0 ? (
                      <span>Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="text-primary hover:underline disabled:opacity-50"
                      >
                        Resend
                      </button>
                    )}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToDetails}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Login Required Step (user exists but not logged in) */}
        {step === "login-required" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Sign in required</CardTitle>
              <CardDescription>
                An account already exists for {invitation?.email}. Please sign in to accept this invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Joining: <span className="font-medium">{invitation?.workspaceName}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="ml-6">Role: <span className="font-medium capitalize">{invitation?.role}</span></span>
                </div>
              </div>

              <Button onClick={handleGoToLogin} className="w-full">
                Sign in to accept
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleBackToDetails}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </CardContent>
          </>
        )}

        {/* Details Step */}
        {step === "details" && (
          <>
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

              {/* Not logged in - new user flow */}
              {!isLoggedIn && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button onClick={handleSendOtp} className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Accept & verify email"
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    We'll send a verification code to {invitation?.email}
                  </p>
                </div>
              )}

              {/* Logged in as correct user */}
              {isLoggedIn && isCorrectUser && (
                <Button onClick={handleAcceptLoggedIn} className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join workspace"
                  )}
                </Button>
              )}

              {/* Logged in as wrong user */}
              {isLoggedIn && !isCorrectUser && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    You're logged in as {session?.user?.email}. This invitation is for {invitation?.email}.
                  </p>
                  <Button variant="outline" className="w-full" onClick={handleGoToLogin}>
                    Sign in with different account
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
