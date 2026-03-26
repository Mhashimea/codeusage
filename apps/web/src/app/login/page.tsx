"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  Users,
  FolderKanban,
  DollarSign,
  Terminal,
  Zap,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import { CodeUsageLogoBrand } from "@/components/shared/CodeUsageLogo";
import { ClaudeIcon, CodexIcon } from "@/components/shared/ProviderBadge";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const features = [
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description:
      "Track token usage, costs, and task metrics across your entire team in real-time.",
  },
  {
    icon: Users,
    title: "Developer Insights",
    description:
      "See who's using AI tools, how often, and measure productivity improvements.",
  },
  {
    icon: FolderKanban,
    title: "Project Tracking",
    description:
      "Monitor AI usage by project to understand where tools add the most value.",
  },
  {
    icon: DollarSign,
    title: "Cost Management",
    description:
      "Get detailed cost breakdowns by developer, project, and model to optimize spend.",
  },
  {
    icon: Terminal,
    title: "CLI Integration",
    description:
      "Simple CLI hooks into Claude Code and Codex. One command to start tracking.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "We only collect metadata. No prompts, no code, no sensitive data ever leaves your machine.",
  },
];

const steps = [
  {
    step: "1",
    title: "Install the CLI",
    description: "Run npm install -g codeusage to get started",
    code: "npm install -g codeusage",
  },
  {
    step: "2",
    title: "Initialize",
    description: "Connect to your workspace with one command",
    code: "codeusage init",
  },
  {
    step: "3",
    title: "Start Coding",
    description: "Use Claude Code or Codex as usual. We handle the rest.",
    code: "claude # just code!",
  },
];

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const signInRef = useRef<HTMLDivElement>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp") {
      otpInputsRef.current[0]?.focus();
    }
  }, [step]);

  // Scroll to sign in when toggled
  useEffect(() => {
    if (showSignIn && signInRef.current) {
      signInRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showSignIn]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send verification code");
        return;
      }

      setStep("otp");
      setCountdown(60);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
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

  const handleVerifyOTP = async (otpValue: string) => {
    setError("");
    setIsLoading(true);
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid verification code");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsVerifying(false);
    } finally {
      setIsLoading(false);
    }
  };

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
        handleVerifyOTP(otpValue);
      }
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      handleVerifyOTP(pastedData);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsOAuthLoading(provider);
    setError("");
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch {
      setError("Something went wrong. Please try again.");
      setIsOAuthLoading(null);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <CodeUsageLogoBrand size={32} />
              <span className="text-lg font-semibold">CodeUsage</span>
            </div>
            <Button
              onClick={() => setShowSignIn(true)}
              className="bg-[#D97757] hover:bg-[#c5684a] text-white"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D97757]/10 border border-[#D97757]/20 mb-8">
            <div className="flex items-center gap-1">
              <ClaudeIcon className="h-4 w-4" />
              <CodexIcon className="h-4 w-4" />
            </div>
            <span className="text-sm text-[#D97757]">
              Works with Claude Code & Codex
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Know how your team uses{" "}
            <span className="text-[#D97757]">AI coding tools</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            CodeUsage gives engineering leaders visibility into AI tool adoption
            — who&apos;s using them, on which projects, and what it costs. No code
            leaves your machine.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => setShowSignIn(true)}
              className="bg-[#D97757] hover:bg-[#c5684a] text-white px-8"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/radixhr/codeusage-cli"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-muted-foreground">
            <Shield className="inline h-4 w-4 mr-1" />
            Privacy-first: Only metadata is collected. Your code stays on your
            machine.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything you need to understand AI tool usage
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get insights into how your engineering team leverages AI coding
              assistants to ship faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-[#D97757]/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-[#D97757]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Up and running in 60 seconds
            </h2>
            <p className="text-muted-foreground">
              Three commands is all it takes to start tracking.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex gap-6 items-start p-6 rounded-xl border border-border bg-card"
              >
                <div className="h-10 w-10 rounded-full bg-[#D97757] flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">{item.step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {item.description}
                  </p>
                  <code className="inline-block px-4 py-2 rounded-lg bg-background border border-border font-mono text-sm text-[#D97757]">
                    {item.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing/Free Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-500">Free during beta</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">Start tracking for free</h2>
          <p className="text-muted-foreground mb-8">
            CodeUsage is free while in beta. No credit card required.
          </p>
          <div className="inline-block p-6 rounded-xl border border-border bg-card text-left">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2">
              {[
                "Unlimited developers",
                "Unlimited projects",
                "Full usage analytics",
                "Cost tracking",
                "30-day data retention",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sign In Section */}
      <section
        ref={signInRef}
        className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-muted/30"
      >
        <div className="max-w-sm mx-auto">
          <Card className="border-border">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="flex items-center justify-center gap-2">
                <CodeUsageLogoBrand size={36} />
                <span className="text-xl font-semibold">CodeUsage</span>
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {step === "email" ? "Get started" : "Enter verification code"}
                </CardTitle>
                <CardDescription>
                  {step === "email"
                    ? "Sign in or create an account"
                    : `We sent a code to ${email}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                  {error}
                </div>
              )}

              {step === "email" ? (
                <>
                  {/* OAuth Buttons */}
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={isOAuthLoading !== null || isLoading}
                    >
                      {isOAuthLoading === "google" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GoogleIcon className="mr-2 h-4 w-4" />
                      )}
                      Continue with Google
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuthSignIn("github")}
                      disabled={isOAuthLoading !== null || isLoading}
                    >
                      {isOAuthLoading === "github" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GitHubIcon className="mr-2 h-4 w-4" />
                      )}
                      Continue with GitHub
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  {/* Email Form */}
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading || isOAuthLoading !== null}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#D97757] hover:bg-[#c5684a]"
                      disabled={isLoading || isOAuthLoading !== null || !email}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending code...
                        </>
                      ) : (
                        "Continue with Email"
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  {/* Verifying Overlay */}
                  {isVerifying && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-[#D97757]" />
                      <p className="text-sm text-muted-foreground">
                        Verifying code...
                      </p>
                    </div>
                  )}

                  {/* OTP Input */}
                  {!isVerifying && (
                    <div className="space-y-4">
                      <div
                        className="flex justify-center gap-2"
                        onPaste={handleOtpPaste}
                      >
                        {otp.map((digit, index) => (
                          <Input
                            key={index}
                            ref={(el) => {
                              otpInputsRef.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) =>
                              handleOtpChange(index, e.target.value)
                            }
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
                              onClick={handleResendOTP}
                              disabled={isLoading}
                              className="text-[#D97757] hover:underline disabled:opacity-50"
                            >
                              Resend
                            </button>
                          )}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={handleBack}
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to sign in
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CodeUsageLogoBrand size={24} />
              <span className="font-semibold">CodeUsage</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CodeUsage. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a
                href="https://github.com/radixhr/codeusage-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
