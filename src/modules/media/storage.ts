// Kontrakt adaptera storage (S3-compatible: MinIO/AWS/R2). Patrz docs/04-adapters.md.
// Implementacja S3 dochodzi w Fazie 2 (upload przez presigned URL).

export interface StorageAdapter {
  getUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ url: string; fields?: Record<string, string> }>;

  getPublicUrl(key: string): string;

  delete(key: string): Promise<void>;
}
