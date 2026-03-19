import { NextRequest, NextResponse } from "next/server";
import { db, workspaces } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  workspaceName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { workspaceName, email, password } = result.data;

    // Check if workspace with this email already exists
    const existing = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.name, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password for login
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate API key for CLI usage
    const { generateApiKey, hashApiKey } = await import("@/lib/api-key");
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    // Create workspace with separate password_hash and api_key_hash
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: email, // Using email as name for lookup in auth
        display_name: workspaceName, // User's display name
        password_hash: passwordHash, // For login authentication
        api_key_hash: apiKeyHash, // For CLI API key
        plan: "free",
      })
      .returning();

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspaceName,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
