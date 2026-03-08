import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  Code,
  Package,
  Zap,
} from 'lucide-react';
import TrendLineChart from '@/components/charts/TrendLineChart';
import QualityScoreChart from '@/components/charts/QualityScoreChart';

interface SearchParams {
  range?: string;
}

interface FullReport {
  findings?: Array<{ ruleId: string; severity: string }>;
}

async function getTrends(userId: string, range: string) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const reports = await prisma.report.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      errorCount: true,
      warningCount: true,
      infoCount: true,
      filesChanged: true,
      linesAdded: true,
      linesRemoved: true,
      commitCount: true,
      hallucinatedDeps: true,
      verifiedDeps: true,
      fullReport: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const byDate = new Map<string, {
    errors: number;
    warnings: number;
    infos: number;
    files: number;
    linesAdded: number;
    linesRemoved: number;
    commits: number;
    reports: number;
    hallucinated: number;
    verified: number;
  }>();

  for (const report of reports) {
    const date = report.createdAt.toISOString().split('T')[0];
    const existing = byDate.get(date) ?? {
      errors: 0, warnings: 0, infos: 0, files: 0,
      linesAdded: 0, linesRemoved: 0, commits: 0, reports: 0,
      hallucinated: 0, verified: 0,
    };
    byDate.set(date, {
      errors: existing.errors + report.errorCount,
      warnings: existing.warnings + report.warningCount,
      infos: existing.infos + report.infoCount,
      files: existing.files + report.filesChanged,
      linesAdded: existing.linesAdded + report.linesAdded,
      linesRemoved: existing.linesRemoved + report.linesRemoved,
      commits: existing.commits + report.commitCount,
      reports: existing.reports + 1,
      hallucinated: existing.hallucinated + report.hallucinatedDeps,
      verified: existing.verified + report.verifiedDeps,
    });
  }

  const errorsTrend = Array.from(byDate.entries()).map(([date, d]) => ({
    date,
    value: d.errors,
  }));

  const warningsTrend = Array.from(byDate.entries()).map(([date, d]) => ({
    date,
    value: d.warnings,
  }));

  const velocityTrend = Array.from(byDate.entries()).map(([date, d]) => ({
    date,
    value: d.linesAdded + d.linesRemoved,
  }));

  const depsTrend = Array.from(byDate.entries()).map(([date, d]) => ({
    date,
    verified: d.verified,
    hallucinated: d.hallucinated,
  }));

  // Calculate quality score (0-100)
  // Lower is better for errors/warnings, higher is better overall
  const qualityTrend = Array.from(byDate.entries()).map(([date, d]) => {
    const totalIssues = d.errors * 3 + d.warnings * 1 + d.hallucinated * 5;
    const maxIssues = 50; // Baseline for "bad" quality
    const score = Math.max(0, Math.min(100, 100 - (totalIssues / maxIssues) * 100));
    return { date, value: Math.round(score) };
  });

  // Calculate totals and changes
  const totals = {
    errors: reports.reduce((sum, r) => sum + r.errorCount, 0),
    warnings: reports.reduce((sum, r) => sum + r.warningCount, 0),
    linesAdded: reports.reduce((sum, r) => sum + r.linesAdded, 0),
    linesRemoved: reports.reduce((sum, r) => sum + r.linesRemoved, 0),
    reports: reports.length,
    hallucinated: reports.reduce((sum, r) => sum + r.hallucinatedDeps, 0),
  };

  // Calculate trend direction (compare first half to second half)
  const midpoint = Math.floor(reports.length / 2);
  const firstHalf = reports.slice(0, midpoint);
  const secondHalf = reports.slice(midpoint);

  const calculateChange = (first: number[], second: number[]) => {
    const firstAvg = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
    const secondAvg = second.length ? second.reduce((a, b) => a + b, 0) / second.length : 0;
    if (firstAvg === 0) return secondAvg > 0 ? 100 : 0;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  };

  const trends = {
    errors: calculateChange(
      firstHalf.map(r => r.errorCount),
      secondHalf.map(r => r.errorCount)
    ),
    warnings: calculateChange(
      firstHalf.map(r => r.warningCount),
      secondHalf.map(r => r.warningCount)
    ),
    velocity: calculateChange(
      firstHalf.map(r => r.linesAdded + r.linesRemoved),
      secondHalf.map(r => r.linesAdded + r.linesRemoved)
    ),
  };

  // AI Reliance Score (heuristic based on patterns)
  // Higher score = more AI-generated code patterns detected
  let aiPatterns = 0;
  for (const report of reports) {
    const fullReport = report.fullReport as unknown as FullReport;
    if (fullReport?.findings) {
      for (const finding of fullReport.findings) {
        // AI-specific patterns
        if (['AB001', 'AB003', 'AB010'].includes(finding.ruleId)) {
          aiPatterns++;
        }
      }
    }
  }
  const aiRelianceScore = Math.min(100, Math.round((aiPatterns / Math.max(1, reports.length)) * 20));

  return {
    errorsTrend,
    warningsTrend,
    velocityTrend,
    depsTrend,
    qualityTrend,
    totals,
    trends,
    aiRelianceScore,
    days,
  };
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const params = await searchParams;
  const range = params.range ?? '30d';
  const data = await getTrends(session.user.id, range);

  const ranges = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '1y', label: '1 year' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trends</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Historical analysis of your coding sessions
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
          {ranges.map((r) => (
            <a
              key={r.value}
              href={`/dashboard/trends?range=${r.value}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                range === r.value
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {r.label}
            </a>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          title="Errors"
          value={data.totals.errors}
          change={data.trends.errors}
          icon={AlertCircle}
          color="red"
          invertTrend
        />
        <TrendCard
          title="Warnings"
          value={data.totals.warnings}
          change={data.trends.warnings}
          icon={AlertTriangle}
          color="yellow"
          invertTrend
        />
        <TrendCard
          title="Code Velocity"
          value={`${(data.totals.linesAdded + data.totals.linesRemoved).toLocaleString()}`}
          change={data.trends.velocity}
          icon={Code}
          color="blue"
          suffix=" lines"
        />
        <TrendCard
          title="AI Reliance"
          value={data.aiRelianceScore}
          icon={Zap}
          color="purple"
          suffix="%"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Errors Over Time */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Errors Over Time
          </h2>
          <TrendLineChart data={data.errorsTrend} color="#EF4444" label="Errors" />
        </div>

        {/* Warnings Over Time */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Warnings Over Time
          </h2>
          <TrendLineChart data={data.warningsTrend} color="#F59E0B" label="Warnings" />
        </div>

        {/* Code Velocity */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Code Velocity (Lines Changed)
          </h2>
          <TrendLineChart data={data.velocityTrend} color="#3B82F6" label="Lines" />
        </div>

        {/* Quality Score */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quality Score
          </h2>
          <QualityScoreChart data={data.qualityTrend} />
        </div>
      </div>

      {/* Dependency Health */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dependency Health
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Verified
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Hallucinated
            </span>
          </div>
        </div>
        <DependencyTrendChart data={data.depsTrend} />
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Insights
        </h2>
        <div className="space-y-3">
          {data.trends.errors < 0 && (
            <InsightItem
              type="positive"
              message={`Errors decreased by ${Math.abs(data.trends.errors)}% compared to the previous period`}
            />
          )}
          {data.trends.errors > 20 && (
            <InsightItem
              type="negative"
              message={`Errors increased by ${data.trends.errors}% - consider reviewing recent code changes`}
            />
          )}
          {data.totals.hallucinated > 0 && (
            <InsightItem
              type="warning"
              message={`${data.totals.hallucinated} hallucinated packages detected - verify AI suggestions`}
            />
          )}
          {data.aiRelianceScore > 50 && (
            <InsightItem
              type="info"
              message={`High AI reliance score (${data.aiRelianceScore}%) - ensure thorough code review`}
            />
          )}
          {data.totals.reports === 0 && (
            <InsightItem
              type="info"
              message="No reports in this period. Run `afterburn --sync` to track your sessions."
            />
          )}
          {data.trends.velocity > 50 && (
            <InsightItem
              type="positive"
              message={`Code velocity increased by ${data.trends.velocity}% - great productivity!`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TrendCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  invertTrend = false,
  suffix = '',
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  color: 'red' | 'yellow' | 'blue' | 'purple' | 'green';
  invertTrend?: boolean;
  suffix?: string;
}) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  };

  const isPositive = change !== undefined && (invertTrend ? change < 0 : change > 0);
  const isNegative = change !== undefined && (invertTrend ? change > 0 : change < 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
            }`}>
              {isPositive ? <TrendingDown className="w-4 h-4" /> :
               isNegative ? <TrendingUp className="w-4 h-4" /> :
               <Minus className="w-4 h-4" />}
              {Math.abs(change)}% vs prev period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function InsightItem({
  type,
  message,
}: {
  type: 'positive' | 'negative' | 'warning' | 'info';
  message: string;
}) {
  const styles = {
    positive: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    negative: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  };

  const icons = {
    positive: '✓',
    negative: '✗',
    warning: '!',
    info: 'i',
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${styles[type]}`}>
      <span className="font-bold">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// Client component for dependency trend chart
function DependencyTrendChart({ data }: { data: Array<{ date: string; verified: number; hallucinated: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        No dependency data
      </div>
    );
  }

  // Simple bar representation
  return (
    <div className="space-y-2">
      {data.slice(-14).map((d) => (
        <div key={d.date} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20">
            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <div className="flex-1 flex gap-1 h-4">
            {d.verified > 0 && (
              <div
                className="bg-green-500 rounded"
                style={{ width: `${(d.verified / (d.verified + d.hallucinated + 1)) * 100}%` }}
                title={`${d.verified} verified`}
              />
            )}
            {d.hallucinated > 0 && (
              <div
                className="bg-red-500 rounded"
                style={{ width: `${(d.hallucinated / (d.verified + d.hallucinated + 1)) * 100}%` }}
                title={`${d.hallucinated} hallucinated`}
              />
            )}
          </div>
          <span className="text-xs text-gray-500 w-16 text-right">
            {d.verified + d.hallucinated} deps
          </span>
        </div>
      ))}
    </div>
  );
}
