import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Konfiguracja edge-safe (bez Prismy/bcrypt) — używana przez middleware.
 * Pełna konfiguracja (adapter + Credentials) jest w src/auth.ts.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/auth/login",
  },
  session: {
    // Credentials provider wymaga strategii JWT.
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    // Kontrola dostępu dla tras objętych middleware (patrz src/middleware.ts).
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const path = nextUrl.pathname;

      if (path.startsWith("/admin")) {
        return !!user && (user.role === "ADMIN" || user.role === "STAFF");
      }
      if (path.startsWith("/account")) {
        return !!user;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
