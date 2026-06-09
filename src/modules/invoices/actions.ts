"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/session";
import {
  cancelInvoice,
  createInvoiceFromOrder,
  saveInvoiceSettings,
  type SellerSettings,
} from "./service";

export type InvoiceState = { error?: string; success?: string } | undefined;

export async function issueInvoiceAction(formData: FormData) {
  await requireRole("STAFF");
  const orderId = String(formData.get("orderId"));
  await createInvoiceFromOrder(orderId, {
    buyerNip: formData.get("buyerNip") ? String(formData.get("buyerNip")) : undefined,
    buyerName: formData.get("buyerName") ? String(formData.get("buyerName")) : undefined,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/invoices");
}

export async function cancelInvoiceAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const orderId = formData.get("orderId") ? String(formData.get("orderId")) : null;
  await cancelInvoice(id);
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}

export async function saveInvoiceSettingsAction(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  await requireRole("ADMIN");
  const settings: SellerSettings = {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    taxId: formData.get("taxId") ? String(formData.get("taxId")) : undefined,
    vatExempt: formData.get("vatExempt") === "on",
    exemptionNote: formData.get("exemptionNote")
      ? String(formData.get("exemptionNote"))
      : undefined,
    bankAccount: formData.get("bankAccount")
      ? String(formData.get("bankAccount"))
      : undefined,
    vatRate: Number(formData.get("vatRate")) || 23,
    numberPrefix: String(formData.get("numberPrefix") ?? "FV "),
    paymentTermsDays: Number(formData.get("paymentTermsDays")) || 14,
  };
  if (!settings.name) return { error: "Nazwa sprzedawcy jest wymagana." };
  await saveInvoiceSettings(settings);
  revalidatePath("/admin/settings/invoices");
  return { success: "Zapisano ustawienia faktur." };
}
