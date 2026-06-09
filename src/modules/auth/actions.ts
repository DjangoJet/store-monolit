"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storeConfig } from "@/lib/config";
import { sendPasswordReset, sendWelcome } from "@/modules/notifications/service";
import { toFieldErrors } from "@/lib/forms";
import { forgotSchema, loginSchema, registerSchema } from "./schemas";

export type AuthActionState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

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
    // Tylko błędy formatu (pusty/niepoprawny email, brak hasła) — bezpieczne do pokazania.
    return { error: "Nieprawidłowe dane logowania.", fieldErrors: toFieldErrors(parsed.error) };
  }

  // Tylko ścieżki względne (ochrona przed open-redirect).
  const requested = String(formData.get("redirectTo") ?? "");
  const redirectTo =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : DEFAULT_REDIRECT;

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
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
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Błąd związany z polem -> tylko fieldError (bez duplikatu w ogólnym `error`).
    return { fieldErrors: { email: "Konto z tym adresem email już istnieje." } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "CUSTOMER" },
  });

  await sendWelcome(email, name ?? null);

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

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email.trim(), mode: "insensitive" } },
  });

  // Wysyłamy tylko gdy konto istnieje, ale komunikat zawsze taki sam (nie zdradzamy istnienia).
  if (user?.isActive) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires },
    });
    await sendPasswordReset(
      user.email,
      `${storeConfig.appUrl}/auth/reset?token=${token}`,
    );
  }

  return {
    success: "Jeśli konto istnieje, wyślemy instrukcję resetu hasła na podany adres.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Hasło musi mieć min. 8 znaków." };
  }

  const vt = await prisma.verificationToken.findFirst({ where: { token } });
  if (!vt || vt.expires < new Date()) {
    return { error: "Link resetu jest nieprawidłowy lub wygasł." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email: vt.identifier },
    data: { passwordHash },
  });
  // unieważnij wszystkie tokeny tego użytkownika
  await prisma.verificationToken.deleteMany({ where: { identifier: vt.identifier } });

  return { success: "Hasło zostało zmienione. Możesz się zalogować." };
}
