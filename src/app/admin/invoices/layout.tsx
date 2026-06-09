import { requireFeature } from "@/server/feature";

export default function InvoicesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireFeature("invoices");
  return children;
}
