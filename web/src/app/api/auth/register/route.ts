import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: name || email.split("@")[0],
        password: hashedPassword,
      })
      .returning();

    // Create organization for new user
    const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
    const [org] = await db
      .insert(organizations)
      .values({
        name: `${name || email}'s Workspace`,
        slug: `${slug}-${Date.now().toString(36)}`,
      })
      .returning();

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: newUser.id,
      role: "owner",
    });

    return NextResponse.json(
      { message: "User created successfully", userId: newUser.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
