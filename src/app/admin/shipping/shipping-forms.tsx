"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createMethodAction,
  createZoneAction,
  deleteMethodAction,
  toggleMethodAction,
  updateMethodAction,
  type ShippingState,
} from "@/modules/shipping/actions";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export interface ProviderService {
  id: number;
  service: string;
  name: string;
}

export interface MethodData {
  id: string;
  name: string;
  provider: string;
  serviceCode: string | null;
  priceAmount: number;
  currency: string;
  freeOver: number | null;
  requiresPickupPoint: boolean;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
}

/** grosze -> PLN do pola formularza ("" gdy brak). */
const pln = (g?: number | null) => (g == null ? "" : (g / 100).toFixed(2));

export function ZoneForm() {
  const [state, action, pending] = useActionState<ShippingState, FormData>(
    createZoneAction,
    undefined,
  );
  const errors = state?.fieldErrors;
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="zone-name">Nazwa strefy</Label>
        <Input id="zone-name" name="name" placeholder="np. Polska" aria-invalid={!!errors?.name} />
        <FieldError message={errors?.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="zone-countries">Kraje (kody, po przecinku)</Label>
        <Input
          id="zone-countries"
          name="countries"
          placeholder="PL, DE"
          aria-invalid={!!errors?.countries}
        />
        <FieldError message={errors?.countries} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Dodawanie..." : "Dodaj strefę"}
      </Button>
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      {state?.error && !errors && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

/**
 * Formularz metody — dodawanie (gdy brak `method`) lub edycja (gdy `method` podany).
 * W edycji nie zmieniamy strefy (przenosiny = usuń+dodaj). `onSuccess` zwija formularz.
 */
export function MethodForm({
  zoneId,
  providers,
  services,
  method,
  onSuccess,
}: {
  zoneId: string;
  providers: string[];
  services: ProviderService[];
  method?: MethodData;
  onSuccess?: () => void;
}) {
  const editing = !!method;
  const [state, action, pending] = useActionState<ShippingState, FormData>(
    editing ? updateMethodAction : createMethodAction,
    undefined,
  );
  const [provider, setProvider] = useState(method?.provider ?? providers[0] ?? "manual");
  const errors = state?.fieldErrors;
  const needsService = provider !== "manual";
  const fid = method?.id ?? zoneId; // unikalne id pól w obrębie wiersza/strefy

  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={action} className="space-y-3 rounded-md border border-dashed p-3">
      {editing ? (
        <input type="hidden" name="id" value={method.id} />
      ) : (
        <input type="hidden" name="zoneId" value={zoneId} />
      )}
      <p className="text-xs font-medium text-muted-foreground">
        {editing ? "Edytuj metodę" : "Nowa metoda"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${fid}`}>Nazwa</Label>
          <Input
            id={`name-${fid}`}
            name="name"
            placeholder="np. Kurier DPD"
            defaultValue={method?.name ?? ""}
            aria-invalid={!!errors?.name}
          />
          <FieldError message={errors?.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`provider-${fid}`}>Przewoźnik</Label>
          <select
            id={`provider-${fid}`}
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <FieldError message={errors?.provider} />
        </div>
      </div>

      {needsService && (
        <div className="space-y-1">
          <Label htmlFor={`service-${fid}`}>Usługa przewoźnika</Label>
          {services.length > 0 ? (
            <select
              id={`service-${fid}`}
              name="serviceCode"
              defaultValue={method?.serviceCode ?? ""}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              aria-invalid={!!errors?.serviceCode}
            >
              <option value="">— wybierz —</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} (id {s.id})
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`service-${fid}`}
              name="serviceCode"
              placeholder="numeryczny service_id"
              defaultValue={method?.serviceCode ?? ""}
              aria-invalid={!!errors?.serviceCode}
            />
          )}
          <FieldError message={errors?.serviceCode} />
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nie udało się pobrać listy usług — wpisz service_id ręcznie.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Kurier i paczkomat to ta sama usługa — dodaj przewoźnika dwa razy: raz bez,
              raz z zaznaczonym „punkt odbioru” poniżej.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`price-${fid}`}>Cena dla klienta (PLN)</Label>
          <Input
            id={`price-${fid}`}
            name="price"
            type="number"
            step="0.01"
            placeholder="15.00"
            defaultValue={method ? pln(method.priceAmount) : ""}
            aria-invalid={!!errors?.price}
          />
          <FieldError message={errors?.price} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`freeOver-${fid}`}>Darmowa od (PLN)</Label>
          <Input
            id={`freeOver-${fid}`}
            name="freeOver"
            type="number"
            step="0.01"
            placeholder="opcjonalnie"
            defaultValue={method ? pln(method.freeOver) : ""}
            aria-invalid={!!errors?.freeOver}
          />
          <FieldError message={errors?.freeOver} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`minDays-${fid}`}>Min. dni</Label>
          <Input
            id={`minDays-${fid}`}
            name="minDays"
            type="number"
            placeholder="1"
            defaultValue={method?.minDays ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`maxDays-${fid}`}>Maks. dni</Label>
          <Input
            id={`maxDays-${fid}`}
            name="maxDays"
            type="number"
            placeholder="2"
            defaultValue={method?.maxDays ?? ""}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresPickupPoint"
          value="on"
          defaultChecked={method?.requiresPickupPoint ?? false}
        />
        Dostawa do punktu odbioru (paczkomat/punkt) — odznacz dla kuriera na adres
      </label>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Zapisywanie..." : editing ? "Zapisz zmiany" : "Dodaj metodę"}
      </Button>
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      {state?.error && !errors && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

/** Wiersz metody: podsumowanie + akcje (edytuj/włącz/usuń) z rozwijaną edycją. */
export function MethodRow({
  method,
  providers,
  services,
}: {
  method: MethodData;
  providers: string[];
  services: ProviderService[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-medium">{method.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {method.provider}
            {method.serviceCode ? ` · service ${method.serviceCode}` : ""}
            {method.requiresPickupPoint ? " · punkt odbioru" : ""}
          </span>
          <div className="text-xs text-muted-foreground">
            {formatMoney(method.priceAmount, method.currency)}
            {method.freeOver != null
              ? ` · darmowa od ${formatMoney(method.freeOver, method.currency)}`
              : ""}
            {!method.isActive ? " · nieaktywna" : ""}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Anuluj" : "Edytuj"}
          </Button>
          <form action={toggleMethodAction}>
            <input type="hidden" name="id" value={method.id} />
            <Button type="submit" variant="outline" size="sm">
              {method.isActive ? "Wyłącz" : "Włącz"}
            </Button>
          </form>
          <form action={deleteMethodAction}>
            <input type="hidden" name="id" value={method.id} />
            <Button type="submit" variant="outline" size="sm">
              Usuń
            </Button>
          </form>
        </div>
      </div>

      {editing && (
        <div className="mt-3">
          <MethodForm
            zoneId={method.id}
            providers={providers}
            services={services}
            method={method}
            onSuccess={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  );
}
