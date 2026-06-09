import { requireFeature } from "@/server/feature";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  requireFeature("cms");
  return children;
}
