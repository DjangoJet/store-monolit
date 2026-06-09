import { env } from "@/lib/env";
import { S3StorageAdapter } from "./s3";
import type { StorageAdapter } from "./storage";

export type { StorageAdapter } from "./storage";

let instance: StorageAdapter | null = null;

/** Singleton storage adaptera. Rzuca czytelnym błędem, gdy S3 nie jest skonfigurowane. */
export function getStorage(): StorageAdapter {
  if (instance) return instance;

  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL } = env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_PUBLIC_URL) {
    throw new Error(
      "Storage S3 nie jest skonfigurowany — uzupełnij S3_* w .env (patrz .env.example).",
    );
  }

  instance = new S3StorageAdapter({
    endpoint: S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: S3_BUCKET,
    accessKey: S3_ACCESS_KEY,
    secretKey: S3_SECRET_KEY,
    publicUrl: S3_PUBLIC_URL,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  return instance;
}

/** Generuje unikalny, bezpieczny klucz obiektu w obrębie prefiksu. */
export function buildMediaKey(prefix: string, filename: string): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}/${crypto.randomUUID()}-${safe}`;
}
