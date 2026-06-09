import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { hasRole, type SessionUser } from "./rbac";

/** Zwraca zalogowanego użytkownika lub null. Do użycia w server components/actions. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  };
}

/** Wymaga zalogowania; w przeciwnym razie redirect na logowanie. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** Wymaga roli (lub wyższej); w przeciwnym razie redirect. */
export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, min)) redirect("/");
  return user;
}
