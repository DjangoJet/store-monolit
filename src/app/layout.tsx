import type { Metadata } from "next";
import { storeConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(storeConfig.appUrl),
  title: {
    default: "store-monolit",
    template: "%s · store-monolit",
  },
  description: "E-commerce template — Next.js 16 monolith",
  openGraph: {
    type: "website",
    siteName: "store-monolit",
    locale: "pl_PL",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
