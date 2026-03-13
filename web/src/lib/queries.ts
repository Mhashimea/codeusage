import { db } from "@/db";
import { sessions, projects, organizations, organizationMembers } from "@/db/schema";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";

export async function getUserOrganization(userId: string) {
  const membership = await db
    .select({
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organization;
}

export async function getOrganizationSessions(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    search?: string;
    projectId?: string;
  }
) {
  const { limit = 20, offset = 0, search, projectId } = options || {};

  // Build where conditions
  const conditions = [eq(projects.organizationId, organizationId)];

  if (projectId) {
    conditions.push(eq(sessions.projectId, projectId));
  }

  // Get sessions with project info
  const sessionsQuery = db
    .select({
      id: sessions.id,
      projectId: sessions.projectId,
      projectName: projects.name,
      projectSlug: projects.slug,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      durationSeconds: sessions.durationSeconds,
      branch: sessions.branch,
      commitHash: sessions.commitHash,
      author: sessions.author,
      filesChanged: sessions.filesChanged,
      linesAdded: sessions.linesAdded,
      linesRemoved: sessions.linesRemoved,
      commitsCount: sessions.commitsCount,
      totalTokens: sessions.totalTokens,
      estimatedCost: sessions.estimatedCost,
      model: sessions.model,
      actionsCount: sessions.actionsCount,
      aiSummary: sessions.aiSummary,
      aiType: sessions.aiType,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.startedAt))
    .limit(limit)
    .offset(offset);

  const results = await sessionsQuery;

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(and(...conditions));

  return {
    sessions: results,
    total: Number(countResult[0]?.count || 0),
  };
}

export async function getSession(sessionId: string) {
  const result = await db
    .select({
      id: sessions.id,
      projectId: sessions.projectId,
      projectName: projects.name,
      projectSlug: projects.slug,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      durationSeconds: sessions.durationSeconds,
      branch: sessions.branch,
      commitHash: sessions.commitHash,
      author: sessions.author,
      filesChanged: sessions.filesChanged,
      linesAdded: sessions.linesAdded,
      linesRemoved: sessions.linesRemoved,
      commitsCount: sessions.commitsCount,
      totalTokens: sessions.totalTokens,
      inputTokens: sessions.inputTokens,
      outputTokens: sessions.outputTokens,
      cacheReadTokens: sessions.cacheReadTokens,
      estimatedCost: sessions.estimatedCost,
      model: sessions.model,
      actionsCount: sessions.actionsCount,
      actionsJson: sessions.actionsJson,
      aiSummary: sessions.aiSummary,
      aiType: sessions.aiType,
      reportMarkdown: sessions.reportMarkdown,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  return result[0];
}

export async function getOrganizationProjects(organizationId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.updatedAt));
}

export async function getOrganizationStats(organizationId: string) {
  const result = await db
    .select({
      totalSessions: sql<number>`count(${sessions.id})`,
      totalTokens: sql<number>`coalesce(sum(${sessions.totalTokens}), 0)`,
      totalCost: sql<number>`coalesce(sum(${sessions.estimatedCost}), 0)`,
      totalFilesChanged: sql<number>`coalesce(sum(${sessions.filesChanged}), 0)`,
    })
    .from(sessions)
    .innerJoin(projects, eq(sessions.projectId, projects.id))
    .where(eq(projects.organizationId, organizationId));

  return {
    totalSessions: Number(result[0]?.totalSessions || 0),
    totalTokens: Number(result[0]?.totalTokens || 0),
    totalCost: Number(result[0]?.totalCost || 0),
    totalFilesChanged: Number(result[0]?.totalFilesChanged || 0),
  };
}
