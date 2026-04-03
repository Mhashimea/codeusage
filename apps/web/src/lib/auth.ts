import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db, users, workspaces, workspaceMembers } from "./db";
import { eq, and, count } from "drizzle-orm";
import type { MemberRole } from "./db/schema";
import { sendNewUserNotification } from "./email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // User ID
      email: string;
      name: string;
      workspaceId: string | null; // Current workspace (null if no workspace)
      role: MemberRole | null; // Role in current workspace
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    workspaceId: string | null;
    role: MemberRole | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string; // User ID
    workspaceId?: string | null;
    role?: MemberRole | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = nextUrl.pathname.startsWith("/app");
      const isOnWorkspaceCreate = nextUrl.pathname === "/workspace/create";

      if (isOnApp) {
        if (isLoggedIn) {
          // If user has no workspace, redirect to workspace creation
          // (This check happens in middleware for better UX)
          return true;
        }
        return false; // Redirect to login
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/app", nextUrl));
      }
      return true;
    },
    async signIn({ user, account }) {
      // For OAuth providers, create or lookup user
      if (account?.provider === "github") {
        const email = user.email;
        if (!email) return false;

        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId: string;
        let currentWorkspaceId: string | null = null;

        if (existingUser.length === 0) {
          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email,
              name: user.name || email.split("@")[0],
              avatar_url: user.image || null,
            })
            .returning();
          userId = newUser.id;

          // Get total user count for admin notification
          const [userCount] = await db
            .select({ count: count() })
            .from(users);
          const totalUsers = Number(userCount?.count) || 1;

          // Notify admin of new signup (non-blocking)
          sendNewUserNotification(email, user.name || null, "github", totalUsers).catch((err) => {
            console.error("Failed to send admin notification:", err);
          });
        } else {
          userId = existingUser[0].id;
          currentWorkspaceId = existingUser[0].current_workspace_id;
        }

        // Set the user ID
        user.id = userId;

        // Get all workspace memberships
        const memberships = await db
          .select({
            workspace_id: workspaceMembers.workspace_id,
            role: workspaceMembers.role,
          })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.user_id, userId));

        if (memberships.length > 0) {
          // Use current_workspace_id if set and user is still a member
          const currentMembership = currentWorkspaceId
            ? memberships.find((m) => m.workspace_id === currentWorkspaceId)
            : null;

          if (currentMembership) {
            user.workspaceId = currentMembership.workspace_id;
            user.role = currentMembership.role;
          } else {
            // Fall back to first workspace
            user.workspaceId = memberships[0].workspace_id;
            user.role = memberships[0].role;

            // Update current_workspace_id
            await db
              .update(users)
              .set({ current_workspace_id: memberships[0].workspace_id })
              .where(eq(users.id, userId));
          }
        } else {
          // No workspace yet - will be redirected to create one
          user.workspaceId = null;
          user.role = null;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
        token.role = user.role;
      }

      // Handle workspace switching (triggered by update())
      if (trigger === "update" && token.id) {
        // Get user's current_workspace_id
        const [dbUser] = await db
          .select({ current_workspace_id: users.current_workspace_id })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (dbUser?.current_workspace_id) {
          // Get role for the current workspace
          const [membership] = await db
            .select({ role: workspaceMembers.role })
            .from(workspaceMembers)
            .where(
              and(
                eq(workspaceMembers.user_id, token.id as string),
                eq(workspaceMembers.workspace_id, dbUser.current_workspace_id)
              )
            )
            .limit(1);

          if (membership) {
            token.workspaceId = dbUser.current_workspace_id;
            token.role = membership.role;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string | null;
        session.user.role = token.role as MemberRole | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
