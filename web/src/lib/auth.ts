import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users, organizations, organizationMembers, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingUser.length === 0) {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: user.email,
            name: user.name,
            image: user.image,
          })
          .returning();

        // Create organization for new user
        const slug = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
        const [org] = await db
          .insert(organizations)
          .values({
            name: `${user.name || user.email}'s Workspace`,
            slug: `${slug}-${Date.now().toString(36)}`,
          })
          .returning();

        await db.insert(organizationMembers).values({
          organizationId: org.id,
          userId: newUser.id,
          role: "owner",
        });

        // Store the user ID for JWT
        user.id = newUser.id;
      } else {
        user.id = existingUser[0].id;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Extend the session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
