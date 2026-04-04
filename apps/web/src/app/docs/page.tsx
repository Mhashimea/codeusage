"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Terminal,
  Settings,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { CodeusageLogoBrand } from "@/components/shared/CodeusageLogo";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Navigation sections
const sections = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "commands", label: "Commands", icon: Terminal },
  { id: "prompt-guard", label: "Prompt Guard", icon: ShieldCheck },
  { id: "configuration", label: "Configuration", icon: Settings },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
];

// Code block component with copy button
function CodeBlock({
  children,
  showPrompt = true,
}: {
  children: string;
  showPrompt?: boolean;
}) {
  return (
    <div className="group relative bg-muted/30 border border-border/50 rounded-lg p-3 font-mono text-sm mb-5">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={children} />
      </div>
      <code className="text-foreground text-[13px]">
        {showPrompt && <span className="text-[#D97757]">$ </span>}
        {children}
      </code>
    </div>
  );
}

// Terminal block with multiple commands
function TerminalBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Terminal</span>
      </div>
      <div className="p-4 font-mono text-[13px] space-y-2.5">{children}</div>
    </div>
  );
}

// Command row inside terminal
function CommandRow({
  command,
  description,
}: {
  command: string;
  description?: string;
}) {
  return (
    <div className="group relative">
      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={command} />
      </div>
      <div className="flex items-start gap-2 pr-10">
        <span className="text-[#D97757]">$</span>
        <span className="text-foreground">{command}</span>
      </div>
      {description && (
        <p className="text-muted-foreground/70 text-xs mt-0.5 ml-4">
          {description}
        </p>
      )}
    </div>
  );
}

// Section heading
function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold mb-4 pt-12 scroll-mt-24 border-t border-border/30 first:border-t-0 first:pt-0"
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mb-3 mt-10 text-foreground">{children}</h3>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground leading-relaxed mb-5">{children}</p>;
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <CodeusageLogoBrand size={32} />
              <span className="text-lg font-semibold">Codeusage</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/docs" className="text-sm text-[#D97757] font-medium">
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="flex gap-12">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeSection === id
                      ? "bg-[#D97757]/10 text-[#D97757]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            {/* Getting Started */}
            <section id="getting-started">
              <SectionHeading id="getting-started">
                Getting Started
              </SectionHeading>

              <Paragraph>
                Codeusage is a CLI tool that automatically tracks your AI coding
                tool usage and sends telemetry to your team dashboard. It
                captures metadata only — no prompts, no code, no sensitive data.
              </Paragraph>

              <SubHeading>Installation</SubHeading>

              <Paragraph>
                Install the Codeusage CLI globally using bun:
              </Paragraph>

              <CodeBlock>bun add -g codeusage-cli</CodeBlock>

              <Paragraph>Or using other package managers:</Paragraph>

              <TerminalBlock>
                <CommandRow
                  command="bun add -g codeusage-cli"
                  description="bun"
                />
                <CommandRow
                  command="npm install -g codeusage-cli"
                  description="npm"
                />
                <CommandRow
                  command="yarn global add codeusage-cli"
                  description="yarn"
                />
                <CommandRow
                  command="pnpm add -g codeusage-cli"
                  description="pnpm"
                />
              </TerminalBlock>

              <SubHeading>Quick Start</SubHeading>

              <Paragraph>
                After installation, initialize Codeusage to connect to your
                workspace:
              </Paragraph>

              <CodeBlock>codeusage init</CodeBlock>

              <Paragraph>
                The init command will guide you through the setup process:
              </Paragraph>

              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-5 ml-4 leading-relaxed">
                <li>
                  Enter your workspace API key (get it from your dashboard)
                </li>
                <li>Enter your developer name/alias</li>
                <li>Choose tracking scope (global or project-specific)</li>
              </ol>

              <Paragraph>
                Once initialized, tracking is automatic. Every time you complete
                a task with Claude Code, Codeusage sends the metadata to your
                dashboard.
              </Paragraph>

              <SubHeading>Verify Setup</SubHeading>

              <Paragraph>Check your configuration status:</Paragraph>

              <CodeBlock>codeusage status</CodeBlock>

              <Paragraph>This shows:</Paragraph>

              <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground mb-5 ml-4 leading-relaxed">
                <li>Connection status and masked API key</li>
                <li>Your developer alias</li>
                <li>Tracking status (global or project)</li>
                <li>Current project mapping</li>
                <li>Number of buffered tasks (if any)</li>
              </ul>
            </section>

            {/* Commands */}
            <section id="commands">
              <SectionHeading id="commands">Commands</SectionHeading>

              <Paragraph>
                Complete reference for all Codeusage CLI commands.
              </Paragraph>

              <SubHeading>codeusage init</SubHeading>
              <Paragraph>
                Initialize Codeusage and connect to your workspace.
              </Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage init"
                  description="Interactive setup wizard"
                />
                <CommandRow
                  command="codeusage init --force"
                  description="Reinitialize even if already configured"
                />
              </TerminalBlock>

              <SubHeading>codeusage status</SubHeading>
              <Paragraph>
                Display current configuration and connection status.
              </Paragraph>
              <CodeBlock>codeusage status</CodeBlock>

              <SubHeading>codeusage project</SubHeading>
              <Paragraph>
                Manage project mappings. By default, Codeusage detects projects
                from git remotes. Use these commands to override or customize.
              </Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage project current"
                  description="Show project for current directory"
                />
                <CommandRow
                  command="codeusage project set my-project"
                  description="Set project name for current directory"
                />
                <CommandRow
                  command="codeusage project list"
                  description="List all project mappings"
                />
                <CommandRow
                  command="codeusage project ignore"
                  description="Ignore current directory (stop tracking)"
                />
                <CommandRow
                  command="codeusage project unignore"
                  description="Remove override for current directory"
                />
              </TerminalBlock>

              <SubHeading>codeusage config</SubHeading>
              <Paragraph>View and modify CLI configuration settings.</Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage config"
                  description="Show current configuration"
                />
                <CommandRow
                  command="codeusage config show"
                  description="Same as above"
                />
                <CommandRow
                  command="codeusage config scope global"
                  description="Track all projects on your machine"
                />
                <CommandRow
                  command="codeusage config scope project"
                  description="Track only the current project"
                />
                <CommandRow
                  command="codeusage config alias john"
                  description="Change developer alias"
                />
                <CommandRow
                  command="codeusage config set-key cu-ws-xxx"
                  description="Update workspace API key"
                />
              </TerminalBlock>

              <SubHeading>codeusage sync</SubHeading>
              <Paragraph>
                Manually flush buffered tasks to the server. Tasks are
                automatically buffered when offline and synced when connection
                is restored.
              </Paragraph>
              <CodeBlock>codeusage sync</CodeBlock>

              <SubHeading>codeusage logout</SubHeading>
              <Paragraph>
                Disconnect from Codeusage and remove all local configuration.
              </Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage logout"
                  description="Disconnect (with confirmation)"
                />
                <CommandRow
                  command="codeusage logout --force"
                  description="Disconnect without confirmation"
                />
              </TerminalBlock>
            </section>

            {/* Prompt Guard */}
            <section id="prompt-guard">
              <SectionHeading id="prompt-guard">Prompt Guard</SectionHeading>

              <Paragraph>
                Prompt Guard is a security feature that scans your prompts
                locally before they&apos;re sent to the AI model, detecting and
                blocking potential credential leaks like API keys, database
                passwords, and private keys.
              </Paragraph>

              <SubHeading>How It Works</SubHeading>
              <Paragraph>
                When enabled, Prompt Guard scans your prompts locally before
                they&apos;re sent to the AI. It checks for 44 built-in patterns
                covering common credential types:
              </Paragraph>

              <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground mb-5 ml-4 leading-relaxed">
                <li>AWS access keys and secret keys</li>
                <li>Database URLs (PostgreSQL, MySQL, MongoDB, Redis)</li>
                <li>Private keys (RSA, EC, generic PEM blocks)</li>
                <li>
                  API tokens (GitHub, Slack, Stripe, OpenAI, Anthropic, etc.)
                </li>
                <li>Environment variables with sensitive key names</li>
              </ul>

              <Paragraph>
                If a credential is detected, the prompt is blocked and
                you&apos;ll see a warning message explaining what was found.
              </Paragraph>

              <SubHeading>Setup</SubHeading>
              <Paragraph>
                Prompt Guard requires linking your CLI to your Codeusage
                workspace. After running{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                  codeusage init
                </code>
                , enable Prompt Guard:
              </Paragraph>

              <TerminalBlock>
                <CommandRow
                  command="codeusage guard enable"
                  description="Enable Prompt Guard"
                />
                <CommandRow
                  command="codeusage guard status"
                  description="Check Prompt Guard status"
                />
              </TerminalBlock>

              <Paragraph>
                The CLI will sync patterns from your workspace settings.
                Patterns are cached locally at{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                  ~/.codeusage/patterns.json
                </code>{" "}
                and refreshed every 24 hours.
              </Paragraph>

              <SubHeading>Managing Patterns</SubHeading>
              <Paragraph>
                You can enable or disable individual patterns or entire
                categories from the Guard settings page in your Codeusage
                dashboard. Changes sync automatically to all connected CLI
                instances.
              </Paragraph>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold mb-2">Pattern Categories</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• AWS Credentials</li>
                    <li>• Database Connection Strings</li>
                    <li>• Private Keys</li>
                    <li>• API Keys & Tokens</li>
                    <li>• Environment Variables</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold mb-2">Granular Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable/disable entire categories at once, or toggle
                    individual patterns. For example, block Stripe keys but
                    allow MongoDB URLs.
                  </p>
                </div>
              </div>

              <SubHeading>CLI Commands</SubHeading>
              <TerminalBlock>
                <CommandRow
                  command="codeusage guard enable"
                  description="Enable Prompt Guard protection"
                />
                <CommandRow
                  command="codeusage guard disable"
                  description="Disable Prompt Guard"
                />
                <CommandRow
                  command="codeusage guard status"
                  description="Show current status and pattern count"
                />
                <CommandRow
                  command="codeusage guard sync"
                  description="Force refresh patterns from server"
                />
                <CommandRow
                  command="codeusage guard test"
                  description="Test with a sample prompt (dry run)"
                />
              </TerminalBlock>

              <SubHeading>Privacy</SubHeading>
              <Paragraph>
                Prompt Guard runs entirely on your local machine. Your prompts
                are never sent to Codeusage servers — only pattern configuration
                is synced. When a credential is detected, we log the pattern
                match (e.g., &quot;AWS Access Key detected&quot;) but never the
                actual credential value.
              </Paragraph>

              <SubHeading>Bypassing for Specific Prompts</SubHeading>
              <Paragraph>
                If you need to intentionally include a credential (e.g.,
                discussing credential formats), you can temporarily disable
                Prompt Guard:
              </Paragraph>

              <CodeBlock>codeusage guard disable</CodeBlock>

              <Paragraph>
                Remember to re-enable it afterward with{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                  codeusage guard enable
                </code>
                .
              </Paragraph>
            </section>

            {/* Configuration */}
            <section id="configuration">
              <SectionHeading id="configuration">Configuration</SectionHeading>

              <SubHeading>Config File Location</SubHeading>
              <Paragraph>
                Codeusage stores configuration in{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                  ~/.codeusage/config.json
                </code>
                . This file is managed by the CLI — you typically don&apos;t
                need to edit it manually.
              </Paragraph>

              <SubHeading>Configuration Options</SubHeading>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border/50 rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-border font-medium">
                        Option
                      </th>
                      <th className="text-left px-4 py-3 border-b border-border font-medium">
                        Description
                      </th>
                      <th className="text-left px-4 py-3 border-b border-border font-medium">
                        Command
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        workspace_key
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        Your workspace API key
                      </td>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        config set-key
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        developer_alias
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        Your display name on the dashboard
                      </td>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        config alias
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        tracking_scope
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        &quot;global&quot; or &quot;project&quot; — what gets
                        tracked
                      </td>
                      <td className="px-4 py-3 border-b border-border font-mono text-xs">
                        config scope
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">
                        project_overrides
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Per-directory project name mappings
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        project set
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <SubHeading>Tracking Scope</SubHeading>
              <Paragraph>Codeusage supports two tracking scopes:</Paragraph>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold mb-2">Global Scope</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tracks all AI coding activity across all projects on your
                    machine.
                  </p>
                  <CodeBlock showPrompt={false}>
                    codeusage config scope global
                  </CodeBlock>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold mb-2">Project Scope</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Tracks only the current project. Useful when you want
                    selective tracking.
                  </p>
                  <CodeBlock showPrompt={false}>
                    codeusage config scope project
                  </CodeBlock>
                </div>
              </div>

              <SubHeading>Project Detection</SubHeading>
              <Paragraph>
                Codeusage detects projects in the following priority order:
              </Paragraph>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-5 ml-4 leading-relaxed">
                <li>
                  <strong className="text-foreground">Manual override</strong> —
                  set via{" "}
                  <code className="bg-muted px-1 rounded">
                    codeusage project set
                  </code>
                </li>
                <li>
                  <strong className="text-foreground">Git remote</strong> —
                  extracted from{" "}
                  <code className="bg-muted px-1 rounded">
                    git remote get-url origin
                  </code>
                </li>
                <li>
                  <strong className="text-foreground">Default project</strong> —
                  fallback set during init
                </li>
                <li>
                  <strong className="text-foreground">Directory name</strong> —
                  last resort,{" "}
                  <code className="bg-muted px-1 rounded">
                    path.basename(cwd)
                  </code>
                </li>
              </ol>

              <SubHeading>Ignoring Directories</SubHeading>
              <Paragraph>
                To exclude a directory from tracking (e.g., personal projects):
              </Paragraph>
              <CodeBlock>codeusage project ignore</CodeBlock>
              <Paragraph>
                This sets the project mapping to a special{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  __ignored__
                </code>{" "}
                value. Tasks in ignored directories are silently skipped.
              </Paragraph>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting">
              <SectionHeading id="troubleshooting">
                Troubleshooting
              </SectionHeading>

              <SubHeading>Tasks not appearing on dashboard</SubHeading>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-5 ml-4 leading-relaxed">
                <li>
                  Run{" "}
                  <code className="bg-muted px-1 rounded">
                    codeusage status
                  </code>{" "}
                  to verify you&apos;re connected
                </li>
                <li>
                  Check if the directory is ignored:{" "}
                  <code className="bg-muted px-1 rounded">
                    codeusage project current
                  </code>
                </li>
                <li>
                  Try manual sync:{" "}
                  <code className="bg-muted px-1 rounded">codeusage sync</code>
                </li>
                <li>
                  Verify API key is valid:{" "}
                  <code className="bg-muted px-1 rounded">
                    codeusage status
                  </code>{" "}
                  shows connection status
                </li>
              </ol>

              <SubHeading>Tracking not active</SubHeading>
              <Paragraph>
                If{" "}
                <code className="bg-muted px-1 rounded">codeusage status</code>{" "}
                shows tracking is not active:
              </Paragraph>
              <CodeBlock>codeusage init --force</CodeBlock>
              <Paragraph>
                This re-runs the setup wizard and re-enables tracking.
              </Paragraph>

              <SubHeading>Buffered tasks not syncing</SubHeading>
              <Paragraph>
                Tasks are buffered when offline or when the API is unreachable.
                To manually flush:
              </Paragraph>
              <CodeBlock>codeusage sync</CodeBlock>
              <Paragraph>
                Buffer location:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  ~/.codeusage/buffer/
                </code>
              </Paragraph>

              <SubHeading>Wrong project name</SubHeading>
              <Paragraph>
                If tasks are being attributed to the wrong project:
              </Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage project current"
                  description="See current project"
                />
                <CommandRow
                  command="codeusage project set correct-name"
                  description="Override with correct name"
                />
              </TerminalBlock>

              <SubHeading>Reset everything</SubHeading>
              <Paragraph>
                To completely reset Codeusage and start fresh:
              </Paragraph>
              <TerminalBlock>
                <CommandRow
                  command="codeusage logout --force"
                  description="Remove all config and disconnect"
                />
                <CommandRow
                  command="codeusage init"
                  description="Start fresh setup"
                />
              </TerminalBlock>

              <SubHeading>File Locations Reference</SubHeading>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border/50 rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-border font-medium">
                        File
                      </th>
                      <th className="text-left px-4 py-3 border-b border-border font-medium">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    <tr>
                      <td className="px-4 py-3 border-b border-border">
                        Config
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        ~/.codeusage/config.json
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-border">
                        Buffer
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        ~/.codeusage/buffer/
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-border">
                        Session State
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        ~/.codeusage/session-state/
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-border">
                        Patterns Cache
                      </td>
                      <td className="px-4 py-3 border-b border-border text-muted-foreground">
                        ~/.codeusage/patterns.json
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Guard State</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        ~/.codeusage/guard.json
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <SubHeading>Need More Help?</SubHeading>
              <Paragraph>
                If you&apos;re still experiencing issues, contact us at{" "}
                <a
                  href="mailto:hashim@codeusage.dev"
                  className="text-[#D97757] hover:underline"
                >
                  hashim@codeusage.dev
                </a>
              </Paragraph>
            </section>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto gap-1 p-2">
          {sections.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                activeSection === id
                  ? "bg-[#D97757]/10 text-[#D97757]"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
