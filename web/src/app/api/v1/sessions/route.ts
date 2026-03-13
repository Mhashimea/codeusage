import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { db } from "@/db";
import { sessions, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * POST /api/v1/sessions
 * Upload a new session report
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const authResult = await validateApiKey(apiKey);

    if (!authResult.valid || !authResult.organizationId) {
      return NextResponse.json(
        { error: authResult.error || "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      projectName,
      projectSlug,
      startedAt,
      endedAt,
      durationSeconds,
      branch,
      commitHash,
      author,
      filesChanged,
      linesAdded,
      linesRemoved,
      commitsCount,
      totalTokens,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      estimatedCost,
      model,
      actionsCount,
      actionsJson,
      aiSummary,
      aiType,
      reportMarkdown,
    } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 }
      );
    }

    // Find or create project
    const slug = projectSlug || projectName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    let project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, authResult.organizationId),
          eq(projects.slug, slug)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!project) {
      const [newProject] = await db
        .insert(projects)
        .values({
          organizationId: authResult.organizationId,
          name: projectName,
          slug,
        })
        .returning();
      project = newProject;
    }

    // Create session
    const [session] = await db
      .insert(sessions)
      .values({
        projectId: project.id,
        apiKeyId: authResult.apiKeyId,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : null,
        durationSeconds,
        branch,
        commitHash,
        author,
        filesChanged: filesChanged || 0,
        linesAdded: linesAdded || 0,
        linesRemoved: linesRemoved || 0,
        commitsCount: commitsCount || 0,
        totalTokens: totalTokens || 0,
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        cacheReadTokens: cacheReadTokens || 0,
        estimatedCost: estimatedCost?.toString(),
        model,
        actionsCount: actionsCount || 0,
        actionsJson,
        aiSummary,
        aiType,
        reportMarkdown,
      })
      .returning();

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      projectId: project.id,
    });
  } catch (error) {
    console.error("Session upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/sessions
 * List sessions for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const authResult = await validateApiKey(apiKey);

    if (!authResult.valid || !authResult.organizationId) {
      return NextResponse.json(
        { error: authResult.error || "Invalid API key" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get projects for this organization
    const orgProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, authResult.organizationId));

    const projectIds = orgProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ sessions: [], total: 0 });
    }

    // Build query - get sessions for organization's projects
    let query = db
      .select({
        id: sessions.id,
        projectId: sessions.projectId,
        projectName: projects.name,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
        durationSeconds: sessions.durationSeconds,
        branch: sessions.branch,
        author: sessions.author,
        filesChanged: sessions.filesChanged,
        linesAdded: sessions.linesAdded,
        linesRemoved: sessions.linesRemoved,
        totalTokens: sessions.totalTokens,
        estimatedCost: sessions.estimatedCost,
        aiSummary: sessions.aiSummary,
        aiType: sessions.aiType,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .innerJoin(projects, eq(sessions.projectId, projects.id))
      .where(eq(projects.organizationId, authResult.organizationId))
      .orderBy(desc(sessions.startedAt))
      .limit(limit)
      .offset(offset);

    const result = await query;

    return NextResponse.json({
      sessions: result,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Session list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
