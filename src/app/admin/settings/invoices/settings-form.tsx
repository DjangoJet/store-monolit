"use client";

import { useActionState } from "react";
import {
  saveInvoiceSettingsAction,
  type InvoiceState,
} from "@/modules/invoices/actions";
import type { SellerSettings } from "@/modules/invoices/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

export function InvoiceSettingsForm({ settings }: { settings: SellerSettings }) {
  const [state, action, pending] = useActionState<InvoiceState, FormData>(
    saveInvoiceSettingsAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa sprzedawcy *</Label>
        <Input id="name" name="name" defaultValue={settings.name} aria-invalid={!!errors?.name} required />
        <FieldError message={errors?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={settings.address} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taxId">NIP / PESEL</Label>
          <Input id="taxId" name="taxId" defaultValue={settings.taxId ?? ""} aria-invalid={!!errors?.taxId} />
          <FieldError message={errors?.taxId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAccount">Konto bankowe</Label>
          <Input id="bankAccount" name="bankAccount" defaultValue={settings.bankAccount ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vatExempt" defaultChecked={settings.vatExempt} />
        Zwolniony z VAT (np. działalność nierejestrowana) — faktury bez VAT
      </label>
      <div className="space-y-2">
        <Label htmlFor="exemptionNote">Podstawa zwolnienia (gdy bez VAT)</Label>
        <Input
          id="exemptionNote"
          name="exemptionNote"
          placeholder="np. art. 113 ust. 1 ustawy o VAT"
          defaultValue={settings.exemptionNote ?? ""}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vatRate">Stawka VAT (%)</Label>
          <Input
            id="vatRate"
            name="vatRate"
            type="number"
            defaultValue={settings.vatRate}
            aria-invalid={!!errors?.vatRate}
          />
          <FieldError message={errors?.vatRate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numberPrefix">Prefiks numeru</Label>
          <Input id="numberPrefix" name="numberPrefix" defaultValue={settings.numberPrefix} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentTermsDays">Termin (dni)</Label>
          <Input
            id="paymentTermsDays"
            name="paymentTermsDays"
            type="number"
            defaultValue={settings.paymentTermsDays}
            aria-invalid={!!errors?.paymentTermsDays}
          />
          <FieldError message={errors?.paymentTermsDays} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie..." : "Zapisz"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        {state?.success && <span className="text-sm text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}
