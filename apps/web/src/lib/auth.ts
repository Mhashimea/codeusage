import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, workspaces } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// For MVP, we'll use a simple users table approach
// In production, this would use magic link email provider

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      workspaceId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // For MVP: Simple workspace-based auth
        // Check if there's a workspace with this email as name
        // In production, you'd have a proper users table

        // For demo/dev purposes, allow any login and create workspace if needed
        const existingWorkspace = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.name, email))
          .limit(1);

        if (existingWorkspace.length > 0) {
          const workspace = existingWorkspace[0];
          // Verify password against api_key_hash (repurposed for MVP)
          const isValid = await bcrypt.compare(password, workspace.api_key_hash);

          if (isValid) {
            return {
              id: workspace.id,
              email: email,
              name: email,
              workspaceId: workspace.id,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string;
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
