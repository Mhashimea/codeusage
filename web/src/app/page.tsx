import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </div>
            <span className="font-semibold text-lg">Afterburn</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#install" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Install</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 md:py-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm font-medium mb-6">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Now with Claude Code Integration
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Post-Session Intelligence for{" "}
              <span className="text-orange-500">AI-Assisted Coding</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Track your AI coding sessions, monitor token usage, analyze patterns, and gain actionable insights into how AI assists your development workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                Start Free
              </Link>
              <a
                href="https://github.com/hashimea/afterburn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-medium hover:bg-muted transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>

            {/* Terminal Preview */}
            <div className="bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-700 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-zinc-400 text-sm font-mono ml-2">Terminal</span>
              </div>
              <div className="p-4 font-mono text-sm text-left">
                <p className="text-zinc-400"># Run after your Claude Code session</p>
                <p className="text-green-400 mt-2">$ afterburn</p>
                <div className="mt-3 text-zinc-300">
                  <p className="text-orange-400">🔥 Afterburn Session Report</p>
                  <p className="mt-2 text-zinc-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
                  <p className="mt-2">📊 Session Duration: <span className="text-cyan-400">47m 23s</span></p>
                  <p>💰 Tokens Used: <span className="text-cyan-400">142,847</span> (~$0.43)</p>
                  <p>📝 Files Modified: <span className="text-cyan-400">12</span></p>
                  <p>✨ Commits: <span className="text-cyan-400">3</span></p>
                  <p className="mt-2 text-zinc-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
                  <p className="mt-2 text-green-400">✓ Session synced to cloud</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 px-6 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Track AI Coding</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive tools to understand, optimize, and improve your AI-assisted development workflow.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Session Tracking</h3>
                <p className="text-muted-foreground">
                  Automatically capture every AI coding session with detailed metrics on files changed, commits made, and code modifications.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Token Analytics</h3>
                <p className="text-muted-foreground">
                  Monitor token usage and estimated costs across sessions and projects. Understand where your AI budget goes.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">AI Summaries</h3>
                <p className="text-muted-foreground">
                  Get intelligent AI-generated summaries of what was accomplished in each coding session for quick review.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Historical Trends</h3>
                <p className="text-muted-foreground">
                  Visualize trends over time to understand productivity patterns and optimize your AI-assisted workflow.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Custom Rules</h3>
                <p className="text-muted-foreground">
                  Define custom rules to track specific patterns, flag expensive operations, or enforce team standards.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Cloud Sync</h3>
                <p className="text-muted-foreground">
                  Sync sessions across devices, share with your team, and access your data from anywhere with cloud storage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get started in minutes with a simple CLI tool that integrates seamlessly with Claude Code.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-orange-500">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Install Afterburn</h3>
                <p className="text-muted-foreground">
                  Install the CLI globally with npm. It takes less than a minute to set up.
                </p>
                <code className="inline-block mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-mono">
                  npm install -g afterburn
                </code>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-orange-500">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Code with AI</h3>
                <p className="text-muted-foreground">
                  Use Claude Code as you normally would. Afterburn watches for session transcripts automatically.
                </p>
                <code className="inline-block mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-mono">
                  claude
                </code>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-orange-500">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Analyze Session</h3>
                <p className="text-muted-foreground">
                  Run afterburn after your session to get instant insights, summaries, and analytics.
                </p>
                <code className="inline-block mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-mono">
                  afterburn
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Install Section */}
        <section id="install" className="py-20 px-6 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Quick Install</h2>
              <p className="text-lg text-muted-foreground">
                Get up and running in seconds.
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-zinc-400 text-sm font-mono ml-2">Install</span>
                </div>
              </div>
              <div className="p-6 font-mono text-sm space-y-4">
                <div>
                  <p className="text-zinc-400"># Install with npm</p>
                  <p className="text-green-400">$ npm install -g afterburn</p>
                </div>
                <div>
                  <p className="text-zinc-400"># Or with yarn</p>
                  <p className="text-green-400">$ yarn global add afterburn</p>
                </div>
                <div>
                  <p className="text-zinc-400"># Login to sync to cloud (optional)</p>
                  <p className="text-green-400">$ afterburn login</p>
                </div>
                <div>
                  <p className="text-zinc-400"># Run after your coding session</p>
                  <p className="text-green-400">$ afterburn</p>
                </div>
              </div>
            </div>
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center">
                <div className="text-2xl font-bold text-orange-500">1 min</div>
                <div className="text-sm text-muted-foreground">Install time</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center">
                <div className="text-2xl font-bold text-orange-500">0 config</div>
                <div className="text-sm text-muted-foreground">Zero configuration</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center">
                <div className="text-2xl font-bold text-orange-500">100%</div>
                <div className="text-sm text-muted-foreground">Open source</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Start free, upgrade when you need more.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Free</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-4 text-muted-foreground">Perfect for individual developers.</p>
                <ul className="mt-8 space-y-4">
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited local sessions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Session analytics & reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>AI summaries (with your API key)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Custom rules</span>
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="mt-8 w-full inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
              <div className="p-8 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white border-2 border-orange-500 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 rounded-full text-xs font-medium">
                  Most Popular
                </div>
                <div className="text-sm font-medium text-orange-400 uppercase tracking-wide">Pro</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">$9</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="mt-4 text-zinc-400">For power users and teams.</p>
                <ul className="mt-8 space-y-4">
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Cloud sync & backup</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Cross-device access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Team sharing & collaboration</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="mt-8 w-full inline-flex h-11 items-center justify-center rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-zinc-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to understand your AI coding sessions?
            </h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
              Join developers who are tracking their AI-assisted workflow and making data-driven improvements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-orange-500 px-8 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                Get Started Free
              </Link>
              <a
                href="https://github.com/hashimea/afterburn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-700 px-8 text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
              </div>
              <span className="font-semibold">Afterburn</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://github.com/hashimea/afterburn" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Afterburn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
