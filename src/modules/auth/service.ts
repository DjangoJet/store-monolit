import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { storeConfig } from "@/lib/config";
import { linkGuestOrders } from "@/modules/orders/service";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Tworzy token weryfikacji adresu e-mail i zwraca URL do wysłania w mailu. */
export async function createEmailVerificationUrl(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });
  return `${storeConfig.appUrl}/auth/verify?token=${token}`;
}

/**
 * Potwierdza adres e-mail tokenem z maila. Dopiero po potwierdzeniu własności
 * skrzynki podpinamy zamówienia gościa złożone na ten adres — wcześniej każdy
 * mógłby zarejestrować konto na cudzy e-mail i przejąć historię zamówień/faktur.
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token) return false;

  const vt = await prisma.verificationToken.findFirst({ where: { token } });
  if (!vt || vt.expires < new Date()) return false;

  const user = await prisma.user.findUnique({ where: { email: vt.identifier } });
  if (!user) return false;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: user.emailVerified ?? new Date() },
  });
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: vt.identifier, token: vt.token } },
  });
  await linkGuestOrders(user.id, user.email);
  return true;
}
