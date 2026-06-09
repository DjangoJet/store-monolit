import { prisma } from "@/lib/prisma";
import { getStorage } from "./index";

export function listMedia() {
  return prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function deleteMedia(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;
  try {
    await getStorage().delete(asset.key);
  } catch {
    // jeśli plik już nie istnieje w storage, i tak usuwamy rekord
  }
  await prisma.mediaAsset.delete({ where: { id } });
}
