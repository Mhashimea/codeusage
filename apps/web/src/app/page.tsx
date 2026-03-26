"use client";

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
  Clock,
  Coins,
  FileCode,
  User,
  Cpu,
  Calendar,
  Wrench,
  X,
  Activity,
  RefreshCw,
} from "lucide-react";
import { CodeUsageLogoBrand } from "@/components/shared/CodeUsageLogo";
import { ClaudeIcon } from "@/components/shared/ProviderBadge";

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
      "Simple CLI hooks into Claude Code. One command to start tracking.",
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
    command: "codeusage sync",
    description: "Manually sync pending tasks",
  },
  {
    command: "codeusage config",
    description: "View current configuration",
  },
  {
    command: "codeusage project set <name>",
    description: "Set project name for current directory",
  },
  {
    command: "codeusage project list",
    description: "List all project mappings",
  },
  {
    command: "codeusage project ignore",
    description: "Ignore current directory (stop tracking)",
  },
  {
    command: "codeusage project current",
    description: "Show project for current directory",
  },
  {
    command: "codeusage logout",
    description: "Disconnect and remove configuration",
  },
];

export default function LandingPage() {

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
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
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
                <ClaudeIcon className="h-4 w-4" />
                <span className="text-sm text-[#D97757]">
                  Works with Claude Code
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
              </div>
            </div>

            {/* Right - Dashboard Screenshot Mock */}
            <div className="relative animate-fade-in animation-delay-300">
              <div className="relative bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Window Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    CodeUsage Dashboard
                  </span>
                </div>

                {/* Dashboard Content with Drawer */}
                <div className="flex">
                  {/* Left - Task List (dimmed/background) */}
                  <div className="w-[45%] p-3 opacity-60">
                    <div className="text-xs text-muted-foreground mb-2">Tasks</div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-md border text-xs ${
                            i === 1
                              ? "bg-[#D97757]/10 border-[#D97757]/30"
                              : "bg-muted/30 border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ClaudeIcon className="h-3 w-3" />
                            <span className="truncate">Sonnet 4</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Task Detail Drawer */}
                  <div className="w-[55%] border-l border-border bg-background p-4">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <span className="text-sm font-medium">Task Details</span>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Task Info */}
                    <div className="space-y-2 text-xs mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Developer:</span>
                        <span className="font-medium">sarah</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Project:</span>
                        <span className="font-medium">api-service</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">Sonnet 4</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">2:34 PM</span>
                      </div>
                    </div>

                    {/* Token Usage */}
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-2">Token Usage</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md bg-muted/50 border border-border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Input</p>
                          <p className="text-sm font-semibold">12.4k</p>
                        </div>
                        <div className="rounded-md bg-muted/50 border border-border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Output</p>
                          <p className="text-sm font-semibold">3.2k</p>
                        </div>
                        <div className="rounded-md bg-muted/50 border border-border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Cache</p>
                          <p className="text-sm font-semibold">8.1k</p>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3 w-3 text-emerald-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Cost</p>
                          <p className="text-xs font-semibold text-emerald-500">$0.042</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Duration</p>
                          <p className="text-xs font-semibold">2m 15s</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileCode className="h-3 w-3 text-purple-500" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Files</p>
                          <p className="text-xs font-semibold">3</p>
                        </div>
                      </div>
                    </div>

                    {/* Tools Used */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Wrench className="h-3 w-3" />
                        Tools Used
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Edit (5)</span>
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Read (3)</span>
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Bash (2)</span>
                      </div>
                    </div>
                  </div>
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Up and running in 60 seconds
            </h2>
            <p className="text-muted-foreground">
              Three commands is all it takes to start tracking.
            </p>
          </div>

          {/* Terminal Window */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
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

            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm space-y-6">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-emerald-500">#</span>
                  <span>Step 1: Install the CLI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757]">$</span>
                  <span className="text-foreground">npm install -g codeusage</span>
                </div>
                <div className="text-emerald-500 pl-4">✓ Installed successfully</div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-emerald-500">#</span>
                  <span>Step 2: Connect to your workspace</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757]">$</span>
                  <span className="text-foreground">codeusage init</span>
                </div>
                <div className="text-muted-foreground pl-4">Enter your API key: ••••••••</div>
                <div className="text-emerald-500 pl-4">✓ Connected to workspace</div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-emerald-500">#</span>
                  <span>Step 3: Start coding — we handle the rest</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757]">$</span>
                  <span className="text-foreground">claude</span>
                </div>
                <div className="text-muted-foreground pl-4 italic">
                  Every task is now tracked automatically...
                </div>
              </div>
            </div>
          </div>

          {/* Features below terminal */}
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-[#D97757] mb-1">60s</div>
              <div className="text-sm text-muted-foreground">Setup time</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-[#D97757] mb-1">0</div>
              <div className="text-sm text-muted-foreground">Config files needed</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-[#D97757] mb-1">100%</div>
              <div className="text-sm text-muted-foreground">Task coverage</div>
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
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Docs
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
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
