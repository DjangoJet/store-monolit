import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter } from "./storage";

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string; // baza URL z bucketem, np. http://localhost:9000/store-media
  forcePathStyle: boolean;
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;

  constructor(private cfg: S3Config) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
    });
  }

  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 600 });
    return { url };
  }

  getPublicUrl(key: string) {
    return `${this.cfg.publicUrl.replace(/\/$/, "")}/${key}`;
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
    );
  }
}
