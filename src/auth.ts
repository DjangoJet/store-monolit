import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/modules/auth/schemas";

/**
 * Pełna konfiguracja Auth.js (Node runtime): adapter Prisma + logowanie email/hasło.
 * OAuth (Google itp.) dodasz tutaj w `providers`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Adapter dla przyszłego OAuth; sesje i tak działają na JWT (strategy w authConfig).
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    // Po zalogowaniu: scal koszyk gościa i podepnij jego zamówienia (po mailu).
    // Dynamiczny import zrywa cykl auth → cart/orders → session → auth.
    async signIn({ user }) {
      if (!user?.id) return;
      try {
        const { mergeGuestCartIntoUser } = await import("@/modules/cart/service");
        await mergeGuestCartIntoUser(user.id);
        if (user.email) {
          const { linkGuestOrders } = await import("@/modules/orders/service");
          await linkGuestOrders(user.id, user.email);
        }
      } catch (err) {
        console.error("Po zalogowaniu (merge koszyka/zamówień) nie powiodło się:", err);
      }
    },
  },
});
