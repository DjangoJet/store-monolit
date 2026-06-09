"use server";

import { z } from "zod";
import { subscribe } from "./service";

export type NewsletterState = { error?: string; success?: string } | undefined;

const schema = z.object({ email: z.string().email() });

export async function subscribeAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Podaj poprawny email." };
  await subscribe(parsed.data.email);
  return { success: "Dziękujemy za zapis!" };
}
