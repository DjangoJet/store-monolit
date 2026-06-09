"use client";

import { useActionState, useState } from "react";
import { placeOrderAction, type CheckoutState } from "@/modules/checkout/actions";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

export interface ShippingMethodOption {
  id: string;
  name: string;
  priceAmount: number;
  currency: string;
  freeOver: number | null;
  requiresPickupPoint: boolean;
  minDays: number | null;
  maxDays: number | null;
}

export function CheckoutForm({
  methods,
  subtotal,
  currency,
  defaultEmail,
  discountAmount = 0,
  discountCode,
  freeShipping = false,
}: {
  methods: ShippingMethodOption[];
  subtotal: number;
  currency: string;
  defaultEmail?: string;
  discountAmount?: number;
  discountCode?: string | null;
  freeShipping?: boolean;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    placeOrderAction,
    undefined,
  );
  const [selectedMethod, setSelectedMethod] = useState(methods[0]?.id ?? "");
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const errors = state?.fieldErrors;

  const method = methods.find((m) => m.id === selectedMethod);
  const baseShipping =
    method && method.freeOver !== null && subtotal >= method.freeOver
      ? 0
      : (method?.priceAmount ?? 0);
  const shipping = freeShipping ? 0 : baseShipping;
  const total = subtotal - discountAmount + shipping;

  return (
    <form action={action} className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Kontakt */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Kontakt</h2>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultEmail}
              aria-invalid={!!errors?.email}
              required
            />
            <FieldError message={errors?.email} />
          </div>
        </section>

        {/* Adres */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Adres dostawy</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię *</Label>
              <Input
                id="firstName"
                name="firstName"
                aria-invalid={!!errors?.firstName}
                required
              />
              <FieldError message={errors?.firstName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input
                id="lastName"
                name="lastName"
                aria-invalid={!!errors?.lastName}
                required
              />
              <FieldError message={errors?.lastName} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="line1">Ulica i numer *</Label>
            <Input id="line1" name="line1" aria-invalid={!!errors?.line1} required />
            <FieldError message={errors?.line1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="line2">Adres c.d.</Label>
            <Input id="line2" name="line2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Kod *</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="00-000"
                aria-invalid={!!errors?.postalCode}
                required
              />
              <FieldError message={errors?.postalCode} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">Miasto *</Label>
              <Input id="city" name="city" aria-invalid={!!errors?.city} required />
              <FieldError message={errors?.city} />
            </div>
          </div>
          <input type="hidden" name="country" value="PL" />
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" aria-invalid={!!errors?.phone} />
            <FieldError message={errors?.phone} />
          </div>
        </section>

        {/* Wysyłka */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Dostawa</h2>
          <div className="space-y-2">
            {methods.map((m) => {
              const free = m.freeOver !== null && subtotal >= m.freeOver;
              return (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shippingMethodId"
                      value={m.id}
                      checked={selectedMethod === m.id}
                      onChange={() => setSelectedMethod(m.id)}
                      required
                    />
                    {m.name}
                  </span>
                  <span>{free ? "0,00 zł" : formatMoney(m.priceAmount, m.currency)}</span>
                </label>
              );
            })}
            <FieldError message={errors?.shippingMethodId} />
          </div>
          {method?.requiresPickupPoint && (
            <div className="space-y-2">
              <Label htmlFor="pickupPointCode">Kod punktu odbioru *</Label>
              <Input
                id="pickupPointCode"
                name="pickupPointCode"
                placeholder="np. WAW01A"
                aria-invalid={!!errors?.pickupPointCode}
                required
              />
              <FieldError message={errors?.pickupPointCode} />
              <p className="text-xs text-muted-foreground">
                Widget mapy Paczkomatów dojdzie z integracją Furgonetki (Faza 4).
              </p>
            </div>
          )}
        </section>

        {/* Faktura */}
        <section className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="invoiceRequested"
              value="on"
              checked={wantsInvoice}
              onChange={(e) => setWantsInvoice(e.target.checked)}
            />
            Chcę otrzymać fakturę
          </label>

          {wantsInvoice && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="buyerName">Nazwa nabywcy / firmy</Label>
                <Input
                  id="buyerName"
                  name="buyerName"
                  placeholder="np. Acme sp. z o.o. (puste = dane z adresu)"
                  aria-invalid={!!errors?.buyerName}
                />
                <FieldError message={errors?.buyerName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerNip">NIP (dla faktury na firmę)</Label>
                <Input
                  id="buyerNip"
                  name="buyerNip"
                  placeholder="10 cyfr"
                  aria-invalid={!!errors?.buyerNip}
                />
                <FieldError message={errors?.buyerNip} />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="billingSameAsShipping"
                  value="on"
                  checked={billingSame}
                  onChange={(e) => setBillingSame(e.target.checked)}
                />
                Adres do faktury taki sam jak adres dostawy
              </label>

              {!billingSame && (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="billingLine1">Ulica i numer *</Label>
                    <Input
                      id="billingLine1"
                      name="billingLine1"
                      aria-invalid={!!errors?.billingLine1}
                    />
                    <FieldError message={errors?.billingLine1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingLine2">Adres c.d.</Label>
                    <Input id="billingLine2" name="billingLine2" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="billingPostalCode">Kod *</Label>
                      <Input
                        id="billingPostalCode"
                        name="billingPostalCode"
                        placeholder="00-000"
                        aria-invalid={!!errors?.billingPostalCode}
                      />
                      <FieldError message={errors?.billingPostalCode} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="billingCity">Miasto *</Label>
                      <Input
                        id="billingCity"
                        name="billingCity"
                        aria-invalid={!!errors?.billingCity}
                      />
                      <FieldError message={errors?.billingCity} />
                    </div>
                  </div>
                  <input type="hidden" name="billingCountry" value="PL" />
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="customerNote">Uwagi do zamówienia</Label>
          <Textarea id="customerNote" name="customerNote" rows={2} />
        </section>
      </div>

      {/* Podsumowanie */}
      <aside className="h-fit space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Podsumowanie</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Produkty</span>
          <span>{formatMoney(subtotal, currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Rabat{discountCode ? ` (${discountCode})` : ""}</span>
            <span>-{formatMoney(discountAmount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dostawa</span>
          <span>{freeShipping ? "0,00 zł" : formatMoney(shipping, currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Razem</span>
          <span>{formatMoney(total, currency)}</span>
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Przetwarzanie..." : "Zamawiam i płacę"}
        </Button>
      </aside>
    </form>
  );
}
