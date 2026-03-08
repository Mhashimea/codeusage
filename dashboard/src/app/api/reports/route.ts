import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/reports - Create a new report (from CLI --sync)
export async function POST(request: NextRequest) {
  try {
    // Check for license key authentication
    const licenseKey = request.headers.get('X-License-Key');

    let userId: string;

    if (licenseKey) {
      // CLI authentication via license key
      const user = await prisma.user.findUnique({
        where: { licenseKey },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid license key' },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      // Web session authentication
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      userId = session.user.id;
    }

    const body = await request.json();

    // Validate required fields
    const {
      projectName,
      sessionDuration,
      analyzedAt,
      since,
      filesChanged,
      linesAdded,
      linesRemoved,
      commitCount,
      errorCount,
      warningCount,
      infoCount,
      verifiedDeps,
      warningDeps,
      hallucinatedDeps,
      aiProvider,
      llmSummary,
      llmChangelog,
      llmAdr,
      llmTokens,
      llmCost,
      llmModel,
      fullReport,
    } = body;

    if (!projectName || !fullReport) {
      return NextResponse.json(
        { error: 'Missing required fields: projectName, fullReport' },
        { status: 400 }
      );
    }

    // Find or create project
    let project = await prisma.project.findUnique({
      where: {
        userId_name: {
          userId,
          name: projectName,
        },
      },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: projectName,
          userId,
        },
      });
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        userId,
        projectId: project.id,
        sessionDuration: sessionDuration ?? 0,
        analyzedAt: new Date(analyzedAt ?? Date.now()),
        since: since ?? '4h',
        filesChanged: filesChanged ?? 0,
        linesAdded: linesAdded ?? 0,
        linesRemoved: linesRemoved ?? 0,
        commitCount: commitCount ?? 0,
        errorCount: errorCount ?? 0,
        warningCount: warningCount ?? 0,
        infoCount: infoCount ?? 0,
        verifiedDeps: verifiedDeps ?? 0,
        warningDeps: warningDeps ?? 0,
        hallucinatedDeps: hallucinatedDeps ?? 0,
        aiProvider,
        llmSummary,
        llmChangelog,
        llmAdr,
        llmTokens,
        llmCost,
        llmModel,
        fullReport,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      projectId: project.id,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/reports - List reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where = {
      userId: session.user.id,
      ...(projectId && { projectId }),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          project: {
            select: { name: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
