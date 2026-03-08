import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  GitCommit,
  ArrowRight,
  Code,
  Package,
} from 'lucide-react';
import IssuesTrendChart from '@/components/charts/IssuesTrendChart';
import RuleDistributionChart from '@/components/charts/RuleDistributionChart';
import ActivityChart from '@/components/charts/ActivityChart';

interface ReportWithProject {
  id: string;
  createdAt: Date;
  errorCount: number;
  warningCount: number;
  commitCount: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  project: { name: string } | null;
}

interface FullReport {
  findings?: Array<{ ruleId: string }>;
}

async function getStats(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    recentReports,
    totalReports,
    totalErrors,
    totalWarnings,
    reportsThisWeek,
    linesChanged,
    trendData,
  ] = await Promise.all([
    prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        project: { select: { name: true } },
      },
    }),
    prisma.report.count({ where: { userId } }),
    prisma.report.aggregate({
      where: { userId },
      _sum: { errorCount: true },
    }),
    prisma.report.aggregate({
      where: { userId },
      _sum: { warningCount: true },
    }),
    prisma.report.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.report.aggregate({
      where: { userId },
      _sum: { linesAdded: true, linesRemoved: true },
    }),
    prisma.report.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        errorCount: true,
        warningCount: true,
        filesChanged: true,
        fullReport: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Group trend data by date
  const trendByDate = new Map<string, { errors: number; warnings: number; reports: number }>();
  for (const report of trendData) {
    const date = report.createdAt.toISOString().split('T')[0];
    const existing = trendByDate.get(date) ?? { errors: 0, warnings: 0, reports: 0 };
    trendByDate.set(date, {
      errors: existing.errors + report.errorCount,
      warnings: existing.warnings + report.warningCount,
      reports: existing.reports + 1,
    });
  }

  const issuesTrend = Array.from(trendByDate.entries()).map(([date, data]) => ({
    date,
    errors: data.errors,
    warnings: data.warnings,
  }));

  const activityData = Array.from(trendByDate.entries()).map(([date, data]) => ({
    date,
    reports: data.reports,
    filesChanged: 0, // Would need to aggregate
  }));

  // Count rule violations
  const ruleCounts = new Map<string, number>();
  for (const report of trendData) {
    const fullReport = report.fullReport as FullReport;
    if (fullReport?.findings) {
      for (const finding of fullReport.findings) {
        const count = ruleCounts.get(finding.ruleId) ?? 0;
        ruleCounts.set(finding.ruleId, count + 1);
      }
    }
  }

  const ruleColors: Record<string, string> = {
    AB001: '#EF4444', // Credentials - red
    AB002: '#F59E0B', // Error swallowing - yellow
    AB003: '#3B82F6', // Type assertions - blue
    AB004: '#8B5CF6', // Duplicate logic - purple
    AB005: '#EC4899', // Null checks - pink
    AB006: '#06B6D4', // Hardcoded config - cyan
    AB007: '#DC2626', // Security - dark red
    AB008: '#10B981', // Over abstraction - green
    AB009: '#6366F1', // Timeouts - indigo
    AB010: '#F97316', // AI TODOs - orange
  };

  const ruleDistribution = Array.from(ruleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({
      name,
      value,
      color: ruleColors[name] ?? '#6B7280',
    }));

  return {
    recentReports: recentReports as ReportWithProject[],
    totalReports,
    totalErrors: totalErrors._sum.errorCount ?? 0,
    totalWarnings: totalWarnings._sum.warningCount ?? 0,
    reportsThisWeek,
    totalLinesAdded: linesChanged._sum.linesAdded ?? 0,
    totalLinesRemoved: linesChanged._sum.linesRemoved ?? 0,
    issuesTrend,
    activityData,
    ruleDistribution,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const stats = await getStats(session.user.id);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reports"
          value={stats.totalReports}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Total Errors"
          value={stats.totalErrors}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="Total Warnings"
          value={stats.totalWarnings}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="This Week"
          value={stats.reportsThisWeek}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Code className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lines Added</p>
              <p className="text-2xl font-bold text-green-600">+{stats.totalLinesAdded.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Code className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lines Removed</p>
              <p className="text-2xl font-bold text-red-600">-{stats.totalLinesRemoved.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Change</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats.totalLinesAdded - stats.totalLinesRemoved).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Issues Trend (30 days)
          </h2>
          <IssuesTrendChart data={stats.issuesTrend} />
        </div>

        {/* Rule Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Rule Violations
          </h2>
          <RuleDistributionChart data={stats.ruleDistribution} />
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity (30 days)
        </h2>
        <ActivityChart data={stats.activityData} />
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Reports
          </h2>
          <Link
            href="/dashboard/reports"
            className="text-sm text-orange-600 hover:text-orange-500 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {stats.recentReports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No reports yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Run <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">afterburn --sync</code> to sync your first report.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your license key:</p>
              <code className="text-sm font-mono text-orange-600 dark:text-orange-400">
                {session.user.licenseKey ?? 'Loading...'}
              </code>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {stats.recentReports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {report.project?.name ?? 'Unknown Project'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-4 h-4" />
                        {report.commitCount} commits
                      </span>
                      <span>
                        {report.filesChanged} files
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {report.errorCount > 0 && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        {report.errorCount}
                      </span>
                    )}
                    {report.warningCount > 0 && (
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        {report.warningCount}
                      </span>
                    )}
                    {report.errorCount === 0 && report.warningCount === 0 && (
                      <span className="text-green-600 dark:text-green-400 text-sm">Clean</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'yellow' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
