import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db, workspaces } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
    // Credentials (email/password)
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

        const existingWorkspace = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.name, email))
          .limit(1);

        if (existingWorkspace.length > 0) {
          const workspace = existingWorkspace[0];

          if (!workspace.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(password, workspace.password_hash);

          if (isValid) {
            return {
              id: workspace.id,
              email: email,
              name: workspace.display_name || email,
              workspaceId: workspace.id,
            };
          }
        }

        return null;
      },
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
