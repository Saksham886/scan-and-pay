import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/backend/lib/db";
import { comparePassword } from "@/backend/lib/utils/password";
import type { UserRole } from "@/generated/prisma";

declare module "next-auth" {
  interface User {
    role: UserRole;
    cafeId: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      cafeId: string | null;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Retry up to 3 times to handle Neon compute wakeup (P1017 = server closed connection)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email as string },
            });

            if (!user || !user.isActive) {
              console.log("[Auth] User not found or inactive:", credentials.email);
              return null;
            }

            const isValid = await comparePassword(
              credentials.password as string,
              user.passwordHash
            );

            if (!isValid) {
              console.log("[Auth] Invalid password for:", credentials.email);
              return null;
            }

            console.log("[Auth] Login success:", user.email, user.role);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              cafeId: user.cafeId,
            };
          } catch (error: unknown) {
            const code = (error as { code?: string })?.code;
            if (code === "P1017" && attempt < 3) {
              console.warn(`[Auth] DB connection closed (attempt ${attempt}), retrying in 3s...`);
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }
            console.error("[Auth] Authorize error:", error);
            if (code === "P1017") throw new Error("db_unavailable");
            return null;
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.cafeId = user.cafeId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as UserRole;
      session.user.cafeId = token.cafeId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
