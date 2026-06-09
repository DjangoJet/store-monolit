"use client";

import { useActionState } from "react";
import { createProductAction, type FormState } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function NewProductForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createProductAction,
    undefined,
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Tytuł *</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="DRAFT">
            <option value="DRAFT">Szkic</option>
            <option value="ACTIVE">Aktywny</option>
            <option value="ARCHIVED">Zarchiwizowany</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Typ</Label>
          <Select id="type" name="type" defaultValue="PHYSICAL">
            <option value="PHYSICAL">Fizyczny</option>
            <option value="DIGITAL">Cyfrowy</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vatRate">Stawka VAT (%)</Label>
        <Select id="vatRate" name="vatRate" defaultValue="23">
          <option value="23">23%</option>
          <option value="8">8%</option>
          <option value="5">5%</option>
          <option value="0">0% / zw.</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          Używana tylko gdy sprzedawca jest VAT-owcem (patrz ustawienia faktur).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Cena bazowa (PLN) *</Label>
        <Input id="price" name="price" type="text" inputMode="decimal" placeholder="0.00" required />
        <p className="text-xs text-muted-foreground">
          Tworzy pierwszy wariant. Kolejne dodasz po zapisaniu.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Podtytuł</Label>
        <Input id="subtitle" name="subtitle" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea id="description" name="description" rows={5} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Tworzenie..." : "Utwórz produkt"}
      </Button>
    </form>
  );
}
