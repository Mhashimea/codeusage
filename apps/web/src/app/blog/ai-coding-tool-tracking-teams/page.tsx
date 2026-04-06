import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { CopyButton } from "@/components/shared/CopyButton";
import { MockBanner } from "@/components/blog/MockBanner";
import { MockDashboard } from "@/components/blog/MockDashboard";
import { MockTerminal } from "@/components/blog/MockTerminal";
import { MockPromptGuard } from "@/components/blog/MockPromptGuard";

export const metadata: Metadata = {
  title: "We Built Codeusage Because Nobody Knows How Their Team Uses AI Coding Tools",
  description:
    "Teams are rolling out AI coding tools fast. But there's no dashboard, no tracking, no way to know who's using them or on which projects. We built Codeusage to fix that.",
  keywords: [
    "AI coding tools",
    "developer tools",
    "engineering management",
    "Claude Code",
    "Codex",
    "developer productivity",
    "AI tool tracking",
    "prompt guard",
    "credential protection",
  ],
  authors: [{ name: "Hashim", url: "https://codeusage.dev" }],
  openGraph: {
    title: "We Built Codeusage Because Nobody Knows How Their Team Uses AI Coding Tools",
    description:
      "Teams are rolling out AI coding tools fast. But there's no dashboard, no tracking, no way to know who's using them or on which projects. We built Codeusage to fix that.",
    url: "https://codeusage.dev/blog/ai-coding-tool-tracking-teams",
    siteName: "Codeusage",
    type: "article",
    publishedTime: "2026-04-06T00:00:00.000Z",
    authors: ["Hashim"],
    images: [{ url: "https://codeusage.dev/blog/ai-coding-tool-tracking-teams.png", width: 1500, height: 750 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "We Built Codeusage Because Nobody Knows How Their Team Uses AI Coding Tools",
    description:
      "Teams are rolling out AI coding tools fast. But there's no way to know who's using them or on which projects. We built Codeusage to fix that.",
    creator: "@hashim_ea",
    images: ["https://codeusage.dev/blog/ai-coding-tool-tracking-teams.png"],
  },
  alternates: {
    canonical: "https://codeusage.dev/blog/ai-coding-tool-tracking-teams",
  },
};

function CodeBlock({ children }: { children: string }) {
  const lines = children.split("\n");
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg overflow-hidden my-6">
      {lines.map((line, i) => (
        <div
          key={i}
          className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0"
        >
          <code className="text-foreground text-[13px] font-mono">
            <span className="text-[#D97757]">$ </span>
            {line}
          </code>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
            <CopyButton text={line} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IntroducingCodeusagePage() {
  return (
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>April 6, 2026</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>4 min read</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-8">
          We Built Codeusage Because Nobody Knows How Their Team Uses AI Coding
          Tools
        </h1>

        {/* Banner */}
        <MockBanner />

        {/* Content */}
        <div className="space-y-6">
          <p className="text-muted-foreground text-lg leading-relaxed">
            Here&apos;s a question most engineering leads can&apos;t answer:
            which of your developers are actually using AI coding tools — and on
            which projects?
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Teams are rolling out AI coding tools fast. Licences are bought,
            seats are assigned. But after that? Silence. There&apos;s no
            dashboard that tells you who&apos;s using them, how often, on what
            projects, or whether the investment is actually changing how your
            team works.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            We thought that was a problem worth solving.
          </p>

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">What Codeusage Does</h2>

          <p className="text-muted-foreground leading-relaxed">
            Codeusage is a lightweight platform that gives engineering teams
            visibility into AI coding tool usage across their organisation.
            Think of it as your AI tool intelligence layer — one dashboard that
            shows you sessions, developers, projects, and activity patterns.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            No code changes. No complex setup. Just install, init, and it works.
          </p>

          <MockDashboard />

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">Setup Takes 30 Seconds</h2>

          <CodeBlock>{"npm i -g codeusage-cli\ncodeusage init"}</CodeBlock>

          <p className="text-muted-foreground leading-relaxed">
            That&apos;s it. The CLI hooks into your AI coding tool&apos;s native
            event system. Every time a developer completes a task, Codeusage
            captures the metadata — model used, duration, files changed, tools
            used — and sends it to your team dashboard. The developer doesn&apos;t
            need to change how they work. It runs silently in the background.
          </p>

          <MockTerminal />

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">
            See Everything in One Place
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            Once your team is connected, the dashboard shows you:
          </p>

          <ul className="space-y-3 my-4">
            <li className="flex items-start gap-3 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
              <span>
                <strong className="text-foreground">Sessions and tasks</strong>{" "}
                — what&apos;s happening, grouped by developer and project
              </span>
            </li>
            <li className="flex items-start gap-3 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
              <span>
                <strong className="text-foreground">Developer activity</strong>{" "}
                — who&apos;s active, how often, and adoption patterns across the
                team
              </span>
            </li>
            <li className="flex items-start gap-3 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
              <span>
                <strong className="text-foreground">Project breakdowns</strong>{" "}
                — which codebases are getting the most AI-assisted work
              </span>
            </li>
            <li className="flex items-start gap-3 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
              <span>
                <strong className="text-foreground">Usage patterns</strong> —
                session durations, models used, tools invoked
              </span>
            </li>
          </ul>

          <p className="text-muted-foreground leading-relaxed">
            The question shifts from &quot;are people using AI tools?&quot; to
            &quot;how is AI changing the way our team builds software?&quot;
          </p>

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">
            Prompt Guard: Built-In Credential Protection
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            This one came from a real concern. Developers paste things into AI
            prompts — connection strings, API keys, tokens. Sometimes by
            accident, sometimes out of habit.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Prompt Guard scans every prompt locally, on the developer&apos;s
            machine, before it reaches the AI model. If it detects something
            that looks like a credential — an AWS key, a database URL, a
            private key — it blocks the prompt and tells the developer what it
            found.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            No prompts are sent to our servers. No code is captured. The check
            happens entirely on the local machine in milliseconds.
          </p>

          <MockPromptGuard />

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">
            The Line We Don&apos;t Cross
          </h2>

          <div className="bg-muted/20 border-l-[3px] border-[#D97757] rounded-r-lg p-5 my-6">
            <p className="text-foreground font-medium">
              Codeusage captures metadata only.
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            No prompts. No AI responses. No code. No diffs. No file contents.
            Ever.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            We track models, durations, file counts, and tool usage. That&apos;s
            it. The telemetry payload is transparent — you can see exactly what
            gets sent at any time.
          </p>

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">Who It&apos;s For</h2>

          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              Engineering managers and team leads
            </strong>{" "}
            who want to understand AI tool adoption across their team. Are people
            actually using these tools? On which projects? Is the investment
            translating into changed workflows?
          </p>

          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              CTOs and VPs of Engineering
            </strong>{" "}
            who need to report on AI tool adoption and impact without relying on
            anecdotes.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Developers</strong> who want to
            track their own sessions, see their activity patterns over time, and
            use Prompt Guard to scan prompts for credentials before they reach
            the AI.
          </p>

          <hr className="border-border/30 my-10" />

          <h2 className="text-2xl font-bold pt-4">Get Started</h2>

          <div className="bg-card/50 border border-border/50 rounded-xl p-6 my-6 space-y-3">
            <p className="text-foreground font-medium mb-4">
              Codeusage is live and ready to use.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
                <span>
                  <strong className="text-foreground">Install the CLI:</strong>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-[#D97757]">
                    npm i -g codeusage-cli
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
                <span>
                  <strong className="text-foreground">Read the docs:</strong>{" "}
                  <a
                    href="https://codeusage.dev/docs"
                    className="text-[#D97757] hover:underline"
                  >
                    codeusage.dev/docs
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#D97757] shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Open the dashboard:
                  </strong>{" "}
                  <a
                    href="https://codeusage.dev"
                    className="text-[#D97757] hover:underline"
                  >
                    codeusage.dev
                  </a>
                </span>
              </li>
            </ul>
          </div>

          <p className="text-center text-muted-foreground text-sm mt-8">
            Questions or feedback — reach us at{" "}
            <a
              href="mailto:hashim@codeusage.dev"
              className="text-[#D97757] hover:underline"
            >
              hashim@codeusage.dev
            </a>
          </p>
        </div>
      </article>
  );
}
