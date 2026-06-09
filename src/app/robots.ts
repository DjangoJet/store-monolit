import type { MetadataRoute } from "next";
import { storeConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = storeConfig.appUrl.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
