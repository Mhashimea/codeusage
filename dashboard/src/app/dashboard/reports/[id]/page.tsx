import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  GitCommit,
  Package,
  Download,
  Share2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface FullReport {
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
    commitCount: number;
  };
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  findings: Array<{
    ruleId: string;
    message: string;
    severity: string;
    file: string;
    line: number;
    snippet?: string;
  }>;
  dependencies?: Array<{
    name: string;
    version?: string;
    status: string;
    message?: string;
  }>;
}

async function getReport(id: string, userId: string) {
  const report = await prisma.report.findFirst({
    where: { id, userId },
    include: {
      project: { select: { name: true } },
    },
  });

  return report;
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const report = await getReport(id, session.user.id);

  if (!report) {
    notFound();
  }

  const fullReport = report.fullReport as unknown as FullReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/reports"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.project?.name ?? 'Unknown Project'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {new Date(report.createdAt).toLocaleString()}
              {report.aiProvider && ` • via ${report.aiProvider}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Download
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Files Changed"
          value={report.filesChanged}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Lines Added"
          value={`+${report.linesAdded}`}
          icon={GitCommit}
          color="green"
        />
        <StatCard
          label="Lines Removed"
          value={`-${report.linesRemoved}`}
          icon={GitCommit}
          color="red"
        />
        <StatCard
          label="Commits"
          value={report.commitCount}
          icon={GitCommit}
          color="purple"
        />
      </div>

      {/* LLM Summary */}
      {report.llmSummary && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI Summary
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {report.llmSummary}
            </p>
          </div>
          {report.llmChangelog && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Changelog</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {report.llmChangelog}
              </p>
            </div>
          )}
          {report.llmTokens && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {report.llmTokens.toLocaleString()} tokens • ${report.llmCost?.toFixed(4)} • {report.llmModel}
            </p>
          )}
        </div>
      )}

      {/* Risk Findings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Risk Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {report.errorCount} errors, {report.warningCount} warnings, {report.infoCount} info
          </p>
        </div>

        {fullReport.findings && fullReport.findings.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {fullReport.findings.map((finding, idx) => (
              <div key={idx} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <SeverityIcon severity={finding.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                        {finding.ruleId}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {finding.file}:{finding.line}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{finding.message}</p>
                    {finding.snippet && (
                      <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                        {finding.snippet}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No issues detected
            </h3>
          </div>
        )}
      </div>

      {/* Dependency Audit */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dependency Audit
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {report.verifiedDeps} verified, {report.warningDeps} warnings, {report.hallucinatedDeps} hallucinated
          </p>
        </div>

        {fullReport.dependencies && fullReport.dependencies.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {fullReport.dependencies.map((dep, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DependencyStatusIcon status={dep.status} />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dep.name}
                    </span>
                    {dep.version && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400">
                        @{dep.version}
                      </span>
                    )}
                  </div>
                </div>
                {dep.message && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {dep.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No dependencies audited
          </div>
        )}
      </div>

      {/* Files Changed */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Files Changed
          </h2>
        </div>

        {fullReport.files && fullReport.files.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {fullReport.files.slice(0, 50).map((file, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileStatusIcon status={file.status} />
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">+{file.additions}</span>
                  <span className="text-red-600">-{file.deletions}</span>
                </div>
              </div>
            ))}
            {fullReport.files.length > 50 && (
              <div className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                ... and {fullReport.files.length - 50} more files
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No files changed
          </div>
        )}
      </div>

      {/* Commits */}
      {fullReport.commits && fullReport.commits.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Commits
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {fullReport.commits.map((commit, idx) => (
              <div key={idx} className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-orange-600 dark:text-orange-400">
                    {commit.hash.substring(0, 7)}
                  </span>
                  <span className="text-gray-900 dark:text-white">{commit.message}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {commit.author} • {new Date(commit.date).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    case 'warn':
      return <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
    default:
      return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  }
}

function DependencyStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'hallucinated':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    default:
      return <Package className="w-5 h-5 text-gray-400" />;
  }
}

function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'added':
      return <span className="w-5 h-5 flex items-center justify-center text-green-500 font-bold">A</span>;
    case 'modified':
      return <span className="w-5 h-5 flex items-center justify-center text-yellow-500 font-bold">M</span>;
    case 'deleted':
      return <span className="w-5 h-5 flex items-center justify-center text-red-500 font-bold">D</span>;
    case 'renamed':
      return <span className="w-5 h-5 flex items-center justify-center text-blue-500 font-bold">R</span>;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold">?</span>;
  }
}
