import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/shared/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = await (prisma.user as any).findUnique({
          where: { email: credentials.email },
          select: { id: true, email: true, name: true, image: true, role: true, passwordHash: true },
        }) as { id: string; email: string | null; name: string | null; image: string | null; role: string; passwordHash: string | null } | null;

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, fetch role from DB
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbUser = await (prisma.user as any).findUnique({
          where: { email: user.email! },
          select: { id: true, role: true },
        });
        token.role = dbUser?.role ?? "user";
        token.sub = dbUser?.id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.sub as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For Google OAuth: auto-create user if not exists
      if (account?.provider === "google" && user.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await (prisma.user as any).findUnique({
          where: { email: user.email },
        });
        if (!existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.user as any).create({
            data: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              authProvider: "google",
              role: "user",
            },
          });
        }
      }
      return true;
    },
  },
};
