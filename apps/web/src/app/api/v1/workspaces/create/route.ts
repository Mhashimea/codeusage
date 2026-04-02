import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { createWorkspace, getUserWorkspaces } from "@/lib/db/queries/workspaces";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/workspaces/create
 * Create a new workspace (requires authenticated user without a workspace)
 * Returns the API key and sets a new session cookie with the workspace ID
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user already owns a workspace
    const existingWorkspaces = await getUserWorkspaces(userId);
    const ownsWorkspace = existingWorkspaces.some(w => w.role === "owner");

    if (ownsWorkspace) {
      return NextResponse.json(
        { error: "You already own a workspace. Each user can only own one workspace." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Workspace name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Create workspace with current user as owner
    const { workspace, apiKey } = await createWorkspace(name.trim(), userId);

    // Get user details for the new token
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Determine cookie name based on environment
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    // Create a new JWT token with the workspace ID included
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET is not configured");
    }

    const newToken = await encode({
      token: {
        id: userId,
        email: user?.email,
        name: user?.name,
        workspaceId: workspace.id,
        role: "owner" as const,
      },
      secret,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the new session cookie
    const cookieStore = await cookies();

    cookieStore.set(cookieName, newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      apiKey, // Show once - not stored in plaintext
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/workspaces/create] Error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
