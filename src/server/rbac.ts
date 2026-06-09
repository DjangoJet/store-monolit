import type { Role } from "@/generated/prisma/enums";

// Strażnicy uprawnień (RBAC). Pełna implementacja w Fazie 1 (Auth.js).
// Tu kontrakt, by services/strony mogły się do niego odwoływać.

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  ADMIN: 2,
};

export function hasRole(user: SessionUser | null, min: Role): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

/** Rzuca, jeśli użytkownik nie ma wymaganej roli. Używać w Server Actions/layoutach. */
export function assertRole(user: SessionUser | null, min: Role): SessionUser {
  if (!hasRole(user, min)) {
    throw new Error("Brak uprawnień");
  }
  return user as SessionUser;
}
