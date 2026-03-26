import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db, workspaces } from "./db";
import { eq } from "drizzle-orm";

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

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    ipHash?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // OAuth Providers
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create workspace if it doesn't exist
      if (account?.provider === "google" || account?.provider === "github") {
        const email = user.email;
        if (!email) return false;

        const existingWorkspace = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.name, email))
          .limit(1);

        if (existingWorkspace.length === 0) {
          // Create new workspace for OAuth user
          // Dynamic import to avoid Edge Runtime issues with crypto module
          const { generateApiKey, hashApiKey } = await import("./api-key");
          const apiKey = generateApiKey();
          const apiKeyHash = await hashApiKey(apiKey);

          const [newWorkspace] = await db
            .insert(workspaces)
            .values({
              name: email,
              display_name: user.name || email,
              api_key_hash: apiKeyHash,
              plan: "free",
            })
            .returning();

          // Store the workspace ID on the user for the jwt callback
          user.workspaceId = newWorkspace.id;
          user.id = newWorkspace.id;
        } else {
          user.workspaceId = existingWorkspace[0].id;
          user.id = existingWorkspace[0].id;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
      }
      // For OAuth, fetch workspace ID if not set
      if (account && (account.provider === "google" || account.provider === "github") && !token.workspaceId) {
        const email = token.email;
        if (email) {
          const workspace = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.name, email))
            .limit(1);
          if (workspace.length > 0) {
            token.id = workspace[0].id;
            token.workspaceId = workspace[0].id;
          }
        }
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
