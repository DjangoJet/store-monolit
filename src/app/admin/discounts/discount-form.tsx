"use client";

import { useActionState } from "react";
import { createDiscountAction, type DiscountState } from "@/modules/discounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function DiscountForm() {
  const [state, action, pending] = useActionState<DiscountState, FormData>(
    createDiscountAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="code">Kod *</Label>
        <Input id="code" name="code" placeholder="LATO10" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="type">Typ</Label>
          <Select id="type" name="type" defaultValue="PERCENT">
            <option value="PERCENT">Procent (%)</option>
            <option value="FIXED">Kwota (PLN)</option>
            <option value="FREE_SHIPPING">Darmowa wysyłka</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="value">Wartość</Label>
          <Input id="value" name="value" placeholder="10" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="minSubtotal">Min. koszyk (PLN)</Label>
          <Input id="minSubtotal" name="minSubtotal" placeholder="opcjonalnie" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Limit użyć</Label>
          <Input id="usageLimit" name="usageLimit" type="number" placeholder="opcjonalnie" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Dodawanie..." : "Dodaj kod"}
      </Button>
    </form>
  );
}
