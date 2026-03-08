import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  Info,
  FileCode,
  FolderOpen,
} from 'lucide-react';
import RuleBarChart from '@/components/charts/RuleBarChart';

interface FullReport {
  findings?: Array<{
    ruleId: string;
    severity: string;
    file: string;
    message: string;
  }>;
}

const RULE_INFO: Record<string, { name: string; description: string; severity: string }> = {
  AB001: { name: 'Hardcoded Credentials', description: 'API keys, passwords, or secrets in code', severity: 'error' },
  AB002: { name: 'Error Swallowing', description: 'Empty catch blocks or ignored errors', severity: 'warn' },
  AB003: { name: 'Type Assertions', description: 'Unsafe type casts, ts-ignore, or any usage', severity: 'warn' },
  AB004: { name: 'Duplicate Logic', description: 'Repeated code patterns that should be abstracted', severity: 'info' },
  AB005: { name: 'Missing Null Checks', description: 'Operations on potentially null/undefined values', severity: 'warn' },
  AB006: { name: 'Hardcoded Config', description: 'URLs, IPs, or config values in code', severity: 'warn' },
  AB007: { name: 'Security Issues', description: 'eval(), innerHTML, command injection risks', severity: 'error' },
  AB008: { name: 'Over Abstraction', description: 'Unnecessary wrappers or pass-through functions', severity: 'info' },
  AB009: { name: 'Missing Timeouts', description: 'Network calls without timeout handling', severity: 'warn' },
  AB010: { name: 'AI TODOs', description: 'TODO, FIXME, or HACK comments from AI', severity: 'info' },
};

async function getRuleAnalytics(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const reports = await prisma.report.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      createdAt: true,
      fullReport: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Count violations by rule
  const ruleStats = new Map<string, {
    count: number;
    files: Set<string>;
    trend: number[];
  }>();

  // Initialize all rules
  for (const ruleId of Object.keys(RULE_INFO)) {
    ruleStats.set(ruleId, { count: 0, files: new Set(), trend: [] });
  }

  // Group by week for trend calculation
  const weeklyData = new Map<string, Map<string, number>>();

  for (const report of reports) {
    const fullReport = report.fullReport as unknown as FullReport;
    const weekKey = getWeekKey(report.createdAt);

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, new Map());
    }

    if (fullReport?.findings) {
      for (const finding of fullReport.findings) {
        const stats = ruleStats.get(finding.ruleId);
        if (stats) {
          stats.count++;
          stats.files.add(finding.file);
        }

        // Weekly tracking
        const weekRules = weeklyData.get(weekKey)!;
        weekRules.set(finding.ruleId, (weekRules.get(finding.ruleId) ?? 0) + 1);
      }
    }
  }

  // Calculate trends (compare last 2 weeks)
  const weeks = Array.from(weeklyData.keys()).sort();
  const lastWeek = weeks[weeks.length - 1];
  const prevWeek = weeks[weeks.length - 2];

  const ruleTrends = new Map<string, number>();
  for (const ruleId of Object.keys(RULE_INFO)) {
    const lastCount = lastWeek ? (weeklyData.get(lastWeek)?.get(ruleId) ?? 0) : 0;
    const prevCount = prevWeek ? (weeklyData.get(prevWeek)?.get(ruleId) ?? 0) : 0;

    if (prevCount === 0) {
      ruleTrends.set(ruleId, lastCount > 0 ? 100 : 0);
    } else {
      ruleTrends.set(ruleId, Math.round(((lastCount - prevCount) / prevCount) * 100));
    }
  }

  // Get most affected files
  const fileViolations = new Map<string, number>();
  for (const report of reports) {
    const fullReport = report.fullReport as unknown as FullReport;
    if (fullReport?.findings) {
      for (const finding of fullReport.findings) {
        fileViolations.set(finding.file, (fileViolations.get(finding.file) ?? 0) + 1);
      }
    }
  }

  const topFiles = Array.from(fileViolations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Get most affected directories
  const dirViolations = new Map<string, number>();
  for (const [file, count] of fileViolations) {
    const dir = file.split('/').slice(0, -1).join('/') || '/';
    dirViolations.set(dir, (dirViolations.get(dir) ?? 0) + count);
  }

  const topDirs = Array.from(dirViolations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Build rule data for charts
  const ruleData = Object.entries(RULE_INFO).map(([ruleId, info]) => {
    const stats = ruleStats.get(ruleId)!;
    return {
      ruleId,
      name: info.name,
      description: info.description,
      severity: info.severity,
      count: stats.count,
      fileCount: stats.files.size,
      trend: ruleTrends.get(ruleId) ?? 0,
    };
  }).sort((a, b) => b.count - a.count);

  // Summary stats
  const totalViolations = ruleData.reduce((sum, r) => sum + r.count, 0);
  const errorCount = ruleData.filter(r => r.severity === 'error').reduce((sum, r) => sum + r.count, 0);
  const warnCount = ruleData.filter(r => r.severity === 'warn').reduce((sum, r) => sum + r.count, 0);
  const infoCount = ruleData.filter(r => r.severity === 'info').reduce((sum, r) => sum + r.count, 0);

  // Weekly trend data for chart
  const weeklyTrend = Array.from(weeklyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, rules]) => ({
      week,
      total: Array.from(rules.values()).reduce((sum, count) => sum + count, 0),
    }));

  return {
    ruleData,
    topFiles,
    topDirs,
    totalViolations,
    errorCount,
    warnCount,
    infoCount,
    weeklyTrend,
  };
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

export default async function RulesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const data = await getRuleAnalytics(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rule Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Breakdown of violations by rule over the last 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Violations"
          value={data.totalViolations}
          icon={Shield}
          color="blue"
        />
        <SummaryCard
          title="Errors"
          value={data.errorCount}
          icon={AlertCircle}
          color="red"
        />
        <SummaryCard
          title="Warnings"
          value={data.warnCount}
          icon={AlertTriangle}
          color="yellow"
        />
        <SummaryCard
          title="Info"
          value={data.infoCount}
          icon={Info}
          color="gray"
        />
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Violations Per Week
        </h2>
        <RuleBarChart data={data.weeklyTrend} />
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rule Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.ruleData.map((rule) => (
                <tr key={rule.ruleId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-mono text-sm text-orange-600 dark:text-orange-400">
                        {rule.ruleId}
                      </span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {rule.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {rule.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SeverityBadge severity={rule.severity} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {rule.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                    {rule.fileCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <TrendIndicator value={rule.trend} invert />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hot Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Files */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCode className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Most Affected Files
            </h2>
          </div>
          {data.topFiles.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No violations found</p>
          ) : (
            <div className="space-y-3">
              {data.topFiles.map(([file, count], idx) => (
                <div key={file} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate">
                      {file}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Directories */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Most Affected Directories
            </h2>
          </div>
          {data.topDirs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No violations found</p>
          ) : (
            <div className="space-y-3">
              {data.topDirs.map(([dir, count], idx) => (
                <div key={dir} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate">
                      {dir || '/'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recommendations
        </h2>
        <div className="space-y-3">
          {data.ruleData.filter(r => r.count > 0 && r.severity === 'error').slice(0, 3).map((rule) => (
            <div key={rule.ruleId} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Fix {rule.count} {rule.name} violations
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Found in {rule.fileCount} file{rule.fileCount !== 1 ? 's' : ''}. {rule.description}.
                </p>
              </div>
            </div>
          ))}
          {data.ruleData.filter(r => r.trend > 50).slice(0, 2).map((rule) => (
            <div key={`trend-${rule.ruleId}`} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {rule.name} increased by {rule.trend}%
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Consider reviewing recent changes related to {rule.description.toLowerCase()}.
                </p>
              </div>
            </div>
          ))}
          {data.totalViolations === 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  No violations detected!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your code is following best practices. Keep up the good work!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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

function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity as keyof typeof styles] ?? styles.info}`}>
      {severity}
    </span>
  );
}

function TrendIndicator({ value, invert = false }: { value: number; invert?: boolean }) {
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;

  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-gray-500">
        <Minus className="w-4 h-4" />
        0%
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
      {Math.abs(value)}%
    </span>
  );
}
