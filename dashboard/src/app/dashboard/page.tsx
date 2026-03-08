import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  GitCommit,
} from 'lucide-react';

interface ReportWithProject {
  id: string;
  createdAt: Date;
  errorCount: number;
  warningCount: number;
  commitCount: number;
  project: { name: string } | null;
}

async function getStats(userId: string): Promise<{
  recentReports: ReportWithProject[];
  totalReports: number;
  totalErrors: number;
  totalWarnings: number;
}> {
  const [recentReports, totalReports, totalErrors, totalWarnings] = await Promise.all([
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
  ]);

  return {
    recentReports,
    totalReports,
    totalErrors: totalErrors._sum.errorCount ?? 0,
    totalWarnings: totalWarnings._sum.warningCount ?? 0,
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
          value={stats.recentReports.length}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Reports
          </h2>
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
              <div key={report.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                  </div>
                </div>
              </div>
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
