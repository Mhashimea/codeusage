import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiKey, listApiKeys, getUserOrganization } from "@/lib/api-keys";

/**
 * GET /api/v1/api-keys
 * List API keys for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organization = await getUserOrganization(session.user.id);

    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const keys = await listApiKeys(organization.id);

    return NextResponse.json({
      apiKeys: keys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        isRevoked: !!key.revokedAt,
      })),
    });
  } catch (error) {
    console.error("List API keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/api-keys
 * Create a new API key
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

    const organization = await getUserOrganization(session.user.id);

    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, expiresAt } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const result = await createApiKey(
      organization.id,
      name,
      session.user.id,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      id: result.id,
      key: result.fullKey, // Only returned once!
      prefix: result.prefix,
      message: "API key created. Make sure to copy it now - you won't be able to see it again!",
    });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
