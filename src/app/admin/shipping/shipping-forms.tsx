"use client";

import { useActionState, useState } from "react";
import {
  createMethodAction,
  createZoneAction,
  type ShippingState,
} from "@/modules/shipping/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export interface ProviderService {
  id: number;
  service: string;
  name: string;
}

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

export function MethodForm({
  zoneId,
  providers,
  services,
}: {
  zoneId: string;
  providers: string[];
  services: ProviderService[];
}) {
  const [state, action, pending] = useActionState<ShippingState, FormData>(
    createMethodAction,
    undefined,
  );
  const [provider, setProvider] = useState(providers[0] ?? "manual");
  const errors = state?.fieldErrors;
  const needsService = provider !== "manual";

  return (
    <form action={action} className="space-y-3 rounded-md border border-dashed p-3">
      <input type="hidden" name="zoneId" value={zoneId} />
      <p className="text-xs font-medium text-muted-foreground">Nowa metoda</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${zoneId}`}>Nazwa</Label>
          <Input
            id={`name-${zoneId}`}
            name="name"
            placeholder="np. Kurier DPD"
            aria-invalid={!!errors?.name}
          />
          <FieldError message={errors?.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`provider-${zoneId}`}>Przewoźnik</Label>
          <select
            id={`provider-${zoneId}`}
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
          <Label htmlFor={`service-${zoneId}`}>Usługa przewoźnika</Label>
          {services.length > 0 ? (
            <select
              id={`service-${zoneId}`}
              name="serviceCode"
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
              id={`service-${zoneId}`}
              name="serviceCode"
              placeholder="numeryczny service_id"
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
          <Label htmlFor={`price-${zoneId}`}>Cena dla klienta (PLN)</Label>
          <Input
            id={`price-${zoneId}`}
            name="price"
            type="number"
            step="0.01"
            placeholder="15.00"
            aria-invalid={!!errors?.price}
          />
          <FieldError message={errors?.price} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`freeOver-${zoneId}`}>Darmowa od (PLN)</Label>
          <Input
            id={`freeOver-${zoneId}`}
            name="freeOver"
            type="number"
            step="0.01"
            placeholder="opcjonalnie"
            aria-invalid={!!errors?.freeOver}
          />
          <FieldError message={errors?.freeOver} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`minDays-${zoneId}`}>Min. dni</Label>
          <Input id={`minDays-${zoneId}`} name="minDays" type="number" placeholder="1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`maxDays-${zoneId}`}>Maks. dni</Label>
          <Input id={`maxDays-${zoneId}`} name="maxDays" type="number" placeholder="2" />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name="requiresPickupPoint" value="on" />
        Dostawa do punktu odbioru (paczkomat/punkt) — odznacz dla kuriera na adres
      </label>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Dodawanie..." : "Dodaj metodę"}
      </Button>
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      {state?.error && !errors && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
