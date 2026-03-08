import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  FileText,
  AlertCircle,
  AlertTriangle,
  Clock,
  GitCommit,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';

interface SearchParams {
  page?: string;
  sort?: string;
  order?: string;
  project?: string;
  search?: string;
}

async function getReports(
  userId: string,
  { page = '1', sort = 'createdAt', order = 'desc', project, search }: SearchParams
) {
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const where = {
    userId,
    ...(project && { projectId: project }),
    ...(search && {
      project: {
        name: { contains: search, mode: 'insensitive' as const },
      },
    }),
  };

  const orderBy = { [sort]: order };

  const [reports, total, projects] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.report.count({ where }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    reports,
    total,
    projects,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const params = await searchParams;
  const { reports, total, projects, pages, currentPage } = await getReports(
    session.user.id,
    params
  );

  const sortOptions = [
    { value: 'createdAt', label: 'Date' },
    { value: 'errorCount', label: 'Errors' },
    { value: 'warningCount', label: 'Warnings' },
    { value: 'filesChanged', label: 'Files Changed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {total} report{total !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <form className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Project Filter */}
          <div className="min-w-[180px]">
            <select
              name="project"
              defaultValue={params.project}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="min-w-[150px]">
            <select
              name="sort"
              defaultValue={params.sort ?? 'createdAt'}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Order */}
          <div className="min-w-[120px]">
            <select
              name="order"
              defaultValue={params.order ?? 'desc'}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </button>
        </form>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        {reports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No reports found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {params.search || params.project
                ? 'Try adjusting your filters'
                : 'Run `afterburn --sync` to sync your first report'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400">
              <div className="col-span-4">Project</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Changes</div>
              <div className="col-span-2">Issues</div>
              <div className="col-span-2">Status</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    {/* Project */}
                    <div className="col-span-4 mb-2 md:mb-0">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {report.project?.name ?? 'Unknown Project'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {report.aiProvider && `via ${report.aiProvider}`}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2 md:mb-0">
                      <Clock className="w-4 h-4" />
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>

                    {/* Changes */}
                    <div className="col-span-2 text-sm mb-2 md:mb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {report.filesChanged} files
                        </span>
                        <span className="text-green-600">+{report.linesAdded}</span>
                        <span className="text-red-600">-{report.linesRemoved}</span>
                      </div>
                    </div>

                    {/* Issues */}
                    <div className="col-span-2 flex items-center gap-3 mb-2 md:mb-0">
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
                        <span className="text-green-600 dark:text-green-400">Clean</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <StatusBadge
                        errors={report.errorCount}
                        warnings={report.warningCount}
                        hallucinated={report.hallucinatedDeps}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {pages}
                </p>
                <div className="flex items-center gap-2">
                  <PaginationLink
                    page={currentPage - 1}
                    disabled={currentPage <= 1}
                    params={params}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </PaginationLink>
                  <PaginationLink
                    page={currentPage + 1}
                    disabled={currentPage >= pages}
                    params={params}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </PaginationLink>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  errors,
  warnings,
  hallucinated,
}: {
  errors: number;
  warnings: number;
  hallucinated: number;
}) {
  if (hallucinated > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Hallucinated Deps
      </span>
    );
  }
  if (errors > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Has Errors
      </span>
    );
  }
  if (warnings > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Has Warnings
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      All Clear
    </span>
  );
}

function PaginationLink({
  page,
  disabled,
  params,
  children,
}: {
  page: number;
  disabled: boolean;
  params: SearchParams;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
        {children}
      </span>
    );
  }

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);
  if (params.project) searchParams.set('project', params.project);
  if (params.search) searchParams.set('search', params.search);

  return (
    <Link
      href={`/dashboard/reports?${searchParams.toString()}`}
      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}
