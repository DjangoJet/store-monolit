import { requireFeature } from "@/server/feature";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  requireFeature("cms");
  return children;
}
