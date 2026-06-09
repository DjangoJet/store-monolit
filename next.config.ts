import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output dla Dockera (Coolify); działa też na Vercel bez zmian.
  output: "standalone",
  images: {
    // Obrazy serwowane przez storage adapter (S3/MinIO). Uzupełnij host z S3_PUBLIC_URL.
    remotePatterns: [
      // { protocol: "https", hostname: "your-bucket.example.com" },
    ],
  },
};

export default nextConfig;
