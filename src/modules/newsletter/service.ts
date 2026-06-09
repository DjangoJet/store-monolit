import { prisma } from "@/lib/prisma";

export async function subscribe(email: string) {
  return prisma.newsletterSubscriber.upsert({
    where: { email: email.trim().toLowerCase() },
    update: {},
    create: { email: email.trim().toLowerCase() },
  });
}
