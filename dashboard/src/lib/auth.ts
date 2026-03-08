import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import crypto from 'crypto';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    // GitHub OAuth
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
    // License Key authentication (for CLI sync)
    CredentialsProvider({
      id: 'license-key',
      name: 'License Key',
      credentials: {
        licenseKey: { label: 'License Key', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.licenseKey) return null;

        const user = await prisma.user.findUnique({
          where: { licenseKey: credentials.licenseKey },
        });

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // Fetch additional user data
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            licenseKey: true,
            subscriptionStatus: true,
          },
        });

        if (user) {
          session.user.licenseKey = user.licenseKey;
          session.user.subscriptionStatus = user.subscriptionStatus;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Generate license key for new users
      const licenseKey = `AB-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { licenseKey },
      });
    },
  },
};

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      licenseKey?: string | null;
      subscriptionStatus?: string;
    };
  }
}
