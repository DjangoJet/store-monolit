"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/session";
import { buildMediaKey, getStorage } from "./index";
import { deleteMedia } from "./service";

export interface UploadTarget {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

/** Zwraca presigned URL do bezpośredniego uploadu z przeglądarki (admin). */
export async function createUploadUrl(
  filename: string,
  contentType: string,
  prefix = "products",
): Promise<UploadTarget> {
  await requireRole("STAFF");

  const storage = getStorage();
  const key = buildMediaKey(prefix, filename);
  const { url } = await storage.getUploadUrl(key, contentType);

  return { key, uploadUrl: url, publicUrl: storage.getPublicUrl(key) };
}

/** Zapisuje metadane wgranego pliku w bibliotece mediów. */
export async function registerMedia(input: {
  key: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}) {
  await requireRole("STAFF");
  const storage = getStorage();

  return prisma.mediaAsset.create({
    data: {
      key: input.key,
      url: storage.getPublicUrl(input.key),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
    },
  });
}

export async function deleteMediaAction(formData: FormData) {
  await requireRole("STAFF");
  await deleteMedia(String(formData.get("id")));
  revalidatePath("/admin/content/media");
}
