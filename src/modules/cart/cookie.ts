import { cookies } from "next/headers";

const COOKIE = "cartId";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dni

export async function readCartCookie(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function writeCartCookie(id: string) {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearCartCookie() {
  (await cookies()).delete(COOKIE);
}
