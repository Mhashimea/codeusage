import Link from 'next/link';
import { Flame, Terminal, BarChart3, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-8 h-8 text-orange-500" />
          <span className="text-xl font-bold">Afterburn</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <a href="https://github.com/hashimea/afterburn" className="text-gray-400 hover:text-white transition-colors">
            GitHub
          </a>
          <Link
            href="/auth/signin"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/20 text-orange-400 rounded-full text-sm mb-6">
          <Zap className="w-4 h-4" />
          Post-session intelligence for AI-assisted coding
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Know what your AI<br />
          <span className="text-orange-500">actually shipped</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Afterburn analyzes your AI-assisted coding sessions, detecting anti-patterns,
          hallucinated packages, and generating human-readable summaries.
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <code className="bg-gray-800 px-4 py-2 rounded-lg font-mono text-sm">
            npx afterburn ./
          </code>
          <Link
            href="/auth/signin"
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Terminal Preview */}
        <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-sm text-gray-400">Terminal</span>
          </div>
          <div className="p-6 font-mono text-sm text-left">
            <div className="text-gray-400">$ npx afterburn ./</div>
            <div className="mt-2">
              <span className="text-cyan-400">Analyzing session...</span>
            </div>
            <div className="mt-4 text-orange-400">
              ═══════════════════════════════════════════════════════════
            </div>
            <div className="text-orange-400">  AFTERBURN SESSION REPORT</div>
            <div className="text-orange-400 mb-4">
              ═══════════════════════════════════════════════════════════
            </div>
            <div className="space-y-1">
              <div><span className="text-gray-500">Files changed:</span>    <span className="text-yellow-400">12</span></div>
              <div><span className="text-gray-500">Lines added:</span>      <span className="text-green-400">+847</span></div>
              <div><span className="text-gray-500">Lines removed:</span>    <span className="text-red-400">-234</span></div>
            </div>
            <div className="mt-4 border-t border-gray-800 pt-4">
              <div className="text-white font-semibold mb-2">Risk Report</div>
              <div className="text-red-400">  X Hardcoded API key detected (credentials.ts:15)</div>
              <div className="text-yellow-400">  ! Empty catch block (api/handler.ts:42)</div>
              <div className="text-green-400 mt-2">  OK 5 packages verified</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything you need to ship with confidence
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Terminal}
            title="CLI-First"
            description="Runs locally in your terminal. No cloud required. Your code stays on your machine."
          />
          <FeatureCard
            icon={Shield}
            title="10 Anti-Pattern Rules"
            description="Detects hardcoded credentials, error swallowing, type assertions, security issues, and more."
          />
          <FeatureCard
            icon={BarChart3}
            title="Dashboard Sync"
            description="Sync reports to view trends over time, share with your team, and track improvements."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          Built by developers, for developers.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
