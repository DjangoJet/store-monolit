"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { forgotSchema, loginSchema, registerSchema } from "./schemas";

export type AuthActionState = { error?: string; success?: string } | undefined;

const DEFAULT_REDIRECT = "/account";

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Nieprawidłowe dane logowania." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: DEFAULT_REDIRECT });
  } catch (error) {
    // signIn z redirectTo rzuca NEXT_REDIRECT (musi się propagować).
    if (error instanceof AuthError) {
      return { error: "Błędny email lub hasło." };
    }
    throw error;
  }
  return undefined;
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Konto z tym adresem email już istnieje." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "CUSTOMER" },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: DEFAULT_REDIRECT });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Konto utworzone, ale logowanie nie powiodło się." };
    }
    throw error;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Nieprawidłowy adres email." };
  }
  // TODO (Faza 1+): wygenerować token i wysłać email (adapter notifications).
  return {
    success: "Jeśli konto istnieje, wyślemy instrukcję resetu hasła na podany adres.",
  };
}
