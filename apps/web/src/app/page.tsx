"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart3,
  Users,
  FolderKanban,
  Shield,
  ShieldCheck,
  ArrowRight,
  Zap,
  Clock,
  FileCode,
  User,
  Cpu,
  Wrench,
  X,
  Activity,
  RefreshCw,
  FileText,
  GitBranch,
  Check,
  Ban,
  Eye,
  Lock,
  Mail,
  MessageSquare,
} from "lucide-react";
import { CodeusageLogoBrand } from "@/components/shared/CodeusageLogo";
import { ClaudeIcon, CodexIcon } from "@/components/shared/ProviderBadge";

export default function LandingPage() {
  const { data: session } = useSession();
  const ctaLink = session ? "/app" : "/login";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <CodeusageLogoBrand size={32} />
              <span className="text-lg font-semibold">Codeusage</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
              </Link>
              <Link href={ctaLink}>
                <Button className="bg-[#D97757] hover:bg-[#c5684a] text-white">
                  {session ? "Go to App" : "Get Started"}
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
                Know what your team sends to{" "}
                <span className="text-[#D97757]">AI coding tools</span>
              </h1>

              {/* Subheading */}
              <p className="text-xl text-muted-foreground max-w-xl mb-10 animate-slide-up animation-delay-100">
                Codeusage tracks AI coding activity across your team — who&apos;s
                active, which projects are moving, and what tasks are getting
                done — while automatically blocking sensitive data before it
                reaches any AI model.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 animate-slide-up animation-delay-200">
                <Link href={ctaLink}>
                  <Button
                    size="lg"
                    className="bg-[#D97757] hover:bg-[#c5684a] text-white px-8"
                  >
                    {session ? "Go to App" : "Start Free"}
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
                    Codeusage Dashboard
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-500">Live</span>
                  </div>
                </div>

                {/* Dashboard Content with Drawer */}
                <div className="flex">
                  {/* Left - Task List */}
                  <div className="w-[40%] p-3 border-r border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium">Recent Tasks</span>
                      <span className="text-[10px] text-muted-foreground">Today</span>
                    </div>
                    <div className="space-y-2">
                      {/* Active task */}
                      <div className="p-2.5 rounded-lg bg-[#D97757]/10 border border-[#D97757]/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ClaudeIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium truncate">api-service</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>sarah</span>
                          <span className="flex items-center gap-0.5">
                            <span className="text-green-500">+47</span>
                            <span className="text-red-500">-12</span>
                          </span>
                        </div>
                      </div>
                      {/* Other tasks */}
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border opacity-70">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ClaudeIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium truncate">web-app</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>mike</span>
                          <span className="flex items-center gap-0.5">
                            <span className="text-green-500">+128</span>
                            <span className="text-red-500">-34</span>
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border opacity-50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CodexIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium truncate">cli-tools</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>alex</span>
                          <span className="flex items-center gap-0.5">
                            <span className="text-green-500">+89</span>
                            <span className="text-red-500">-5</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right - Task Detail Drawer */}
                  <div className="w-[60%] bg-background p-4">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <ClaudeIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Task Details</span>
                      </div>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Task Info Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Developer:</span>
                        <span className="font-medium">sarah</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">Sonnet 4</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Project:</span>
                        <span className="font-medium">api-service</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">2m 15s</span>
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

                    {/* Files Changed - NEW SECTION */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <FileCode className="h-3 w-3" />
                        Files Changed
                        <span className="ml-auto text-[10px] font-medium text-foreground">3 files</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="text-[11px] font-mono truncate">auth.ts</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                            <span className="text-green-500">+24</span>
                            <span className="text-red-500">-8</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="text-[11px] font-mono truncate">middleware.ts</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                            <span className="text-green-500">+18</span>
                            <span className="text-red-500">-4</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="text-[11px] font-mono truncate">types.ts</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                            <span className="text-green-500">+5</span>
                            <span className="text-red-500">-0</span>
                          </div>
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
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Write (1)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-linear-to-r from-[#D97757]/20 via-transparent to-[#D97757]/20 blur-3xl opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-linear-to-b from-[#D97757]/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-500">Automatic Tracking</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Every task captured <span className="text-[#D97757]">automatically</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Codeusage runs quietly in the background while you code. No manual logging,
            no exports — just code and let us handle the rest.
          </p>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Captures every task</p>
                <p className="text-sm text-muted-foreground">All sessions tracked automatically</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Zero manual work</p>
                <p className="text-sm text-muted-foreground">Set up once, track forever</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Works offline</p>
                <p className="text-sm text-muted-foreground">Syncs when you&apos;re back online</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Complete visibility</p>
                <p className="text-sm text-muted-foreground">Nothing slips through</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Get started in minutes
            </h2>
            <p className="text-muted-foreground">
              Set up once, track everything automatically.
            </p>
          </div>

          {/* Horizontal Steps */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-[#D97757]" />
                </div>
                <div className="text-xs font-medium text-[#D97757] mb-2">Step 1</div>
                <h3 className="text-lg font-semibold mb-2">Create workspace</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up and create a workspace for your team
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-7 -right-4 text-border">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-[#D97757]" />
                </div>
                <div className="text-xs font-medium text-[#D97757] mb-2">Step 2</div>
                <h3 className="text-lg font-semibold mb-2">Copy API key</h3>
                <p className="text-sm text-muted-foreground">
                  Get your API key from Settings
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-7 -right-4 text-border">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Check className="h-7 w-7 text-emerald-500" />
                </div>
                <div className="text-xs font-medium text-emerald-500 mb-2">Step 3</div>
                <h3 className="text-lg font-semibold mb-2">Connect CLI</h3>
                <p className="text-sm text-muted-foreground">
                  Install the CLI and you&apos;re done
                </p>
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-muted-foreground ml-2">Terminal</span>
              </div>
              <div className="p-6 font-mono text-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757]">$</span>
                  <span>bun add -g codeusage-cli</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#D97757]">$</span>
                  <span>codeusage init</span>
                </div>
                <div className="text-muted-foreground pl-4">? Paste your API key: ••••••••••••</div>
                <div className="text-muted-foreground pl-4">? Your name: sarah</div>
                <div className="text-emerald-500 pl-4">✓ Connected! Tasks will now sync automatically.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything you need to understand AI tool usage
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Analytics, insights, and security for your team&apos;s AI coding activity.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Usage Analytics - Tall card */}
            <div className="md:row-span-2 p-6 rounded-2xl border border-border bg-card hover:border-[#D97757]/30 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-[#D97757]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Usage Analytics</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Track token usage and task metrics across your entire team in real-time.
              </p>
              {/* Mini chart visualization */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Input tokens</span>
                  <span className="font-medium">124.5k</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-[#D97757] rounded-full" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Output tokens</span>
                  <span className="font-medium">45.2k</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[40%] bg-blue-500 rounded-full" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cache tokens</span>
                  <span className="font-medium">89.1k</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[55%] bg-emerald-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Developer Insights */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-[#D97757]/30 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-[#D97757]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Developer Insights</h3>
              <p className="text-muted-foreground text-sm">
                See who&apos;s using AI tools, how often, and measure productivity improvements.
              </p>
            </div>

            {/* Project Tracking */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-[#D97757]/30 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-4">
                <FolderKanban className="h-6 w-6 text-[#D97757]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Project Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Monitor AI usage by project to understand where tools add the most value.
              </p>
            </div>

            {/* Prompt Guard - Large featured card */}
            <div className="md:col-span-2 p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/50 transition-all group">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Prompt Guard</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Set rules to automatically detect and block sensitive data before it reaches any AI model. Protect API keys, tokens, passwords, and custom patterns.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">API Keys</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">Passwords</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">Tokens</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">Custom Rules</span>
                  </div>
                </div>
                {/* Visual - Blocked prompt example */}
                <div className="lg:w-64 shrink-0">
                  <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>Scanning prompt...</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <code className="text-[10px] text-red-400 truncate">OPENAI_API_KEY=sk-...</code>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <code className="text-[10px] text-red-400 truncate">password: &quot;admin123&quot;</code>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[10px] text-emerald-400">2 items blocked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy First */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-[#D97757]/30 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-[#D97757]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-muted-foreground text-sm">
                We only collect metadata — token counts, file names, and tool usage. No prompts, no code content, no sensitive data ever leaves your machine.
              </p>
            </div>

            {/* Code Changes - Wide card */}
            <div className="md:col-span-2 lg:col-span-2 p-6 rounded-2xl border border-border bg-card hover:border-[#D97757]/30 transition-all group">
              <div className="flex items-start gap-6">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center mb-4">
                    <GitBranch className="h-6 w-6 text-[#D97757]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Code Changes</h3>
                  <p className="text-muted-foreground text-sm">
                    Track files modified, lines added and removed — see exactly what AI is changing in your codebase.
                  </p>
                </div>
                {/* Mini file changes */}
                <div className="hidden sm:block shrink-0 space-y-2 text-xs font-mono bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-muted-foreground">auth.ts</span>
                    <span><span className="text-green-500">+24</span> <span className="text-red-500">-8</span></span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-muted-foreground">api.ts</span>
                    <span><span className="text-green-500">+12</span> <span className="text-red-500">-3</span></span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-muted-foreground">types.ts</span>
                    <span><span className="text-green-500">+5</span> <span className="text-red-500">-0</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground">
              Common questions about privacy, tracking, and security.
            </p>
          </div>

          <Accordion className="space-y-3">
            <AccordionItem value="item-1" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                What is Codeusage?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Codeusage is an analytics and security platform for AI coding tools. It tracks how your team uses AI assistants like Claude Code and Codex — which developers are active, what projects they&apos;re working on, and what tasks are getting done. It also includes Prompt Guard to block sensitive data before it reaches any AI model.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                Do you see my code or prompts?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                No. Codeusage only collects metadata — token counts, file names, tool usage, and timing. We never see your actual code, prompts, or AI responses. Everything sensitive stays on your machine.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                How do I set it up?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Create a free account, get your API key from Settings, then install our CLI with <code className="bg-muted px-1.5 py-0.5 rounded text-sm">bun add -g codeusage-cli</code> and run <code className="bg-muted px-1.5 py-0.5 rounded text-sm">codeusage init</code>. That&apos;s it — every AI coding session is tracked automatically from that point.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                How does Prompt Guard work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Prompt Guard runs locally on your machine before any prompt is sent to the AI. It scans for patterns like API keys, passwords, and tokens. If it detects sensitive data, it blocks the prompt from being sent. You can customize which patterns to detect from your dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                How does tracking work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                When you finish an AI coding session, our CLI automatically captures metadata like tokens used, files changed, and duration. This data syncs to your dashboard so you and your team can see usage patterns. No manual logging required.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-border rounded-xl px-6 bg-card">
              <AccordionTrigger className="hover:no-underline py-5">
                What AI tools do you support?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Currently, we support Claude Code and Codex. We&apos;re actively working on integrations with more AI coding tools. Let us know what you&apos;d like to see supported.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-linear-to-b from-[#D97757]/10 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ready to track your AI coding usage?
            </h2>
            <p className="text-muted-foreground mb-8">
              Get started in under a minute. Free while in beta.
            </p>
            <Link href={ctaLink}>
              <Button
                size="lg"
                className="bg-[#D97757] hover:bg-[#c5684a] text-white px-8"
              >
                {session ? "Go to App" : "Get Started Free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Contact Options */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mt-16 pt-12 border-t border-border/50">
            <a
              href="mailto:hashim@codeusage.dev"
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center shrink-0 group-hover:bg-[#D97757]/20 transition-colors">
                <Mail className="h-6 w-6 text-[#D97757]" />
              </div>
              <div>
                <p className="font-medium">Email us</p>
                <p className="text-sm text-muted-foreground">hashim@codeusage.dev</p>
              </div>
            </a>
            <a
              href="https://x.com/hashim_ea"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-[#D97757]/30 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-[#D97757]/10 flex items-center justify-center shrink-0 group-hover:bg-[#D97757]/20 transition-colors">
                <MessageSquare className="h-6 w-6 text-[#D97757]" />
              </div>
              <div>
                <p className="font-medium">Reach out on X</p>
                <p className="text-sm text-muted-foreground">@hashim_ea</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CodeusageLogoBrand size={24} />
              <span className="font-semibold">Codeusage</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Codeusage. All rights reserved.
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
