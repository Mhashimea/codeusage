"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  FolderKanban,
  DollarSign,
  Terminal,
  Shield,
  ArrowRight,
  Zap,
  RefreshCw,
  Activity,
} from "lucide-react";
import { CodeUsageLogoBrand } from "@/components/shared/CodeUsageLogo";
import { ClaudeIcon, CodexIcon } from "@/components/shared/ProviderBadge";

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

const commands = [
  {
    command: "codeusage init",
    description: "Initialize and connect to your workspace",
  },
  {
    command: "codeusage status",
    description: "Check connection and sync status",
  },
  {
    command: "codeusage project set <name>",
    description: "Set the project for current directory",
  },
  {
    command: "codeusage project list",
    description: "List all tracked projects",
  },
  {
    command: "codeusage sync",
    description: "Manually sync pending tasks",
  },
  {
    command: "codeusage config",
    description: "View current configuration",
  },
];

// Animated task simulation
const mockTasks = [
  { model: "claude-sonnet-4", tokens: "12.4k", cost: "$0.042", time: "2m 15s" },
  { model: "claude-opus-4", tokens: "8.2k", cost: "$0.156", time: "45s" },
  { model: "claude-sonnet-4", tokens: "24.1k", cost: "$0.089", time: "4m 32s" },
  { model: "claude-haiku-4", tokens: "3.1k", cost: "$0.004", time: "12s" },
];

export default function LandingPage() {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate task tracking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTaskIndex((prev) => (prev + 1) % mockTasks.length);
        setIsAnimating(false);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button className="bg-[#D97757] hover:bg-[#c5684a] text-white">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D97757]/10 border border-[#D97757]/20 mb-8 animate-fade-in">
                <div className="flex items-center gap-1">
                  <ClaudeIcon className="h-4 w-4" />
                  <CodexIcon className="h-4 w-4" />
                </div>
                <span className="text-sm text-[#D97757]">
                  Works with Claude Code & Codex
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-up">
                Know how your team uses{" "}
                <span className="text-[#D97757]">AI coding tools</span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-muted-foreground max-w-xl mb-10 animate-slide-up animation-delay-100">
                CodeUsage gives engineering leaders visibility into AI tool
                adoption — who&apos;s using them, on which projects, and what it
                costs.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 animate-slide-up animation-delay-200">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-[#D97757] hover:bg-[#c5684a] text-white px-8"
                  >
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
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
            </div>

            {/* Right - Animated Demo */}
            <div className="relative animate-fade-in animation-delay-300">
              <div className="relative bg-card border border-border rounded-xl p-6 shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    CodeUsage Dashboard
                  </span>
                </div>

                {/* Live Task Feed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Live Task Feed</span>
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Auto-tracking
                    </span>
                  </div>

                  {/* Animated Task Cards */}
                  {mockTasks.map((task, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all duration-500 ${
                        index === activeTaskIndex
                          ? "bg-[#D97757]/10 border-[#D97757]/30 scale-[1.02]"
                          : "bg-muted/30 border-border"
                      } ${
                        index === activeTaskIndex && isAnimating
                          ? "animate-pulse"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ClaudeIcon className="h-4 w-4" />
                          <span className="font-mono text-sm">{task.model}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {task.tokens}
                          </span>
                          <span className="text-emerald-500 font-medium">
                            {task.cost}
                          </span>
                          <span className="text-muted-foreground">
                            {task.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Auto-sync indicator */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tasks today: <span className="text-foreground font-medium">24</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Syncing automatically
                  </span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-[#D97757]/20 via-transparent to-[#D97757]/20 blur-3xl opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-gradient-to-b from-[#D97757]/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-500">Automatic Tracking</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Every task captured <span className="text-[#D97757]">automatically</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            CodeUsage hooks directly into your AI coding workflow. No manual logging,
            no exports — just code and let us handle the rest.
          </p>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Hooks after every task</p>
                <p className="text-sm text-muted-foreground">Capture all sessions automatically</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Zero manual intervention</p>
                <p className="text-sm text-muted-foreground">Set up once, track forever</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Offline buffering</p>
                <p className="text-sm text-muted-foreground">Never lose data, even offline</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">100% task coverage</p>
                <p className="text-sm text-muted-foreground">Complete usage visibility</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Up and running in 60 seconds
            </h2>
            <p className="text-muted-foreground">
              Three commands is all it takes to start tracking.
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#D97757] via-[#D97757]/50 to-transparent hidden md:block" />

            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Install the CLI",
                  description: "Install CodeUsage globally with npm",
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
                  description:
                    "Use Claude Code or Codex as usual. Every task is tracked automatically.",
                  code: "claude  # just code — we handle the rest!",
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="flex gap-6 items-start p-6 rounded-xl border border-border bg-card group hover:border-[#D97757]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#D97757]/5"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="h-12 w-12 rounded-full bg-[#D97757] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">
                      {item.step}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {item.description}
                    </p>
                    <code className="inline-block px-4 py-2 rounded-lg bg-background border border-border font-mono text-sm text-[#D97757] group-hover:bg-[#D97757]/5 transition-colors">
                      {item.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-muted/30">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#D97757]/5 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="h-12 w-12 rounded-lg bg-[#D97757]/10 flex items-center justify-center mb-4 group-hover:bg-[#D97757]/20 transition-colors">
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

      {/* CLI Commands Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Available Commands</h2>
            <p className="text-muted-foreground">
              Simple CLI commands to manage your tracking setup.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                Terminal
              </span>
            </div>

            {/* Commands */}
            <div className="p-4 font-mono text-sm space-y-4">
              {commands.map((cmd, index) => (
                <div key={index} className="group">
                  <div className="flex items-start gap-2">
                    <span className="text-[#D97757]">$</span>
                    <span className="text-foreground">{cmd.command}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1 ml-4">
                    # {cmd.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-gradient-to-b from-[#D97757]/10 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to track your AI coding usage?
          </h2>
          <p className="text-muted-foreground mb-8">
            Get started in under a minute. Free while in beta.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-[#D97757] hover:bg-[#c5684a] text-white px-8"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/radixhr/codeusage-cli"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="mr-2 h-4 w-4" />
                Star on GitHub
              </a>
            </Button>
          </div>
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

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }

        .animation-delay-100 {
          animation-delay: 100ms;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
