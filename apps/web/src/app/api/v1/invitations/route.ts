import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invitations, workspaces, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { MemberRole } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Generate a secure invitation token
 */
function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash invitation token for storage
 */
async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * GET /api/v1/invitations
 * List pending invitations for the workspace (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch role from database
    const userRole = await getUserWorkspaceRole(session.user.id, session.user.workspaceId);

    // Only admins and owners can view invitations
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pendingInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expires_at: invitations.expires_at,
        created_at: invitations.created_at,
        invited_by_name: users.name,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.invited_by, users.id))
      .where(
        and(
          eq(invitations.workspace_id, session.user.workspaceId),
          eq(invitations.status, "pending")
        )
      );

    return NextResponse.json({ invitations: pendingInvitations });
  } catch (error) {
    console.error("[GET /api/v1/invitations] Error:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

/**
 * POST /api/v1/invitations
 * Create a new invitation (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch role from database
    const userRole = await getUserWorkspaceRole(session.user.id, session.user.workspaceId);

    // Only admins and owners can invite members
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Validate role
    const validRoles: MemberRole[] = ["admin", "member"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Role must be 'admin' or 'member'" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is already a member
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // Check if already a member of this workspace
      const { workspaceMembers } = await import("@/lib/db");
      const existingMember = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspace_id, session.user.workspaceId),
            eq(workspaceMembers.user_id, existingUser[0].id)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        return NextResponse.json(
          { error: "This user is already a member of the workspace" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.workspace_id, session.user.workspaceId),
          eq(invitations.email, normalizedEmail),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const tokenHash = await hashToken(token);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        workspace_id: session.user.workspaceId,
        email: normalizedEmail,
        role,
        token_hash: tokenHash,
        status: "pending",
        invited_by: session.user.id,
        expires_at: expiresAt,
      })
      .returning();

    // Get workspace name and inviter name for email
    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, session.user.workspaceId))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Send invitation email
    // Use APP_URL for production, fallback to NEXTAUTH_URL, then VERCEL_URL, then localhost
    const baseUrl = process.env.APP_URL
      || process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "http://localhost:3003";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    await sendInvitationEmail(
      normalizedEmail,
      workspace?.name || "Workspace",
      inviter?.name || null,
      role,
      inviteUrl
    );

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
      inviteUrl: `/invite/${token}`,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/invitations] Error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
