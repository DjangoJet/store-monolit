"use client";

import { useActionState } from "react";
import { applyDiscountAction, type DiscountState } from "@/modules/discounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DiscountForm() {
  const [state, action, pending] = useActionState<DiscountState, FormData>(
    applyDiscountAction,
    undefined,
  );

  return (
    <div className="space-y-1">
      <form action={action} className="flex gap-2">
        <Input name="code" placeholder="Kod rabatowy" className="max-w-48" />
        <Button type="submit" variant="outline" disabled={pending}>
          Zastosuj
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
    </div>
  );
}
