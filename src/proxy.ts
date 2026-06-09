import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 "proxy" (dawniej "middleware"), edge-safe: tylko authConfig (bez Prismy).
// Logika dostępu w callbacks.authorized; tu wyłącznie zakres tras.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
