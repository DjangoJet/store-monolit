"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/session";
import { toFieldErrors } from "@/lib/forms";
import {
  cancelInvoice,
  createInvoiceFromOrder,
  saveInvoiceSettings,
} from "./service";
import { refreshKsefStatus, submitInvoiceToKsef } from "./efaktura/service";
import { invoiceSettingsSchema } from "./schemas";

export type InvoiceState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

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

// ---- KSeF (ręczna wysyłka / odświeżenie statusu; docelowo przez job) ----

export async function submitKsefAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await submitInvoiceToKsef(id);
  revalidatePath(`/admin/invoices/${id}`);
}

export async function refreshKsefAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await refreshKsefStatus(id);
  revalidatePath(`/admin/invoices/${id}`);
}

export async function saveInvoiceSettingsAction(
  _prev: InvoiceState,
  formData: FormData,
): Promise<InvoiceState> {
  await requireRole("ADMIN");
  const parsed = invoiceSettingsSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    taxId: formData.get("taxId") || undefined,
    vatExempt: formData.get("vatExempt") === "on",
    exemptionNote: formData.get("exemptionNote") || undefined,
    bankAccount: formData.get("bankAccount") || undefined,
    vatRate: formData.get("vatRate") ?? 23,
    numberPrefix: formData.get("numberPrefix") ?? "FV ",
    paymentTermsDays: formData.get("paymentTermsDays") ?? 14,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  await saveInvoiceSettings(parsed.data);
  revalidatePath("/admin/settings/invoices");
  return { success: "Zapisano ustawienia faktur." };
}
