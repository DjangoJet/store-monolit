"use client";

import { useActionState } from "react";
import {
  addVariantAction,
  deleteVariantAction,
  updateVariantAction,
  type FormState,
} from "@/modules/catalog/actions";
import { toMajorString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export interface VariantData {
  id: string;
  title: string;
  sku: string | null;
  priceAmount: number;
  quantity: number;
}

export function VariantRow({
  productId,
  variant,
}: {
  productId: string;
  variant: VariantData;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateVariantAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="grid grid-cols-12 items-start gap-2 rounded-lg border p-3">
      <input type="hidden" name="id" value={variant.id} />
      <input type="hidden" name="productId" value={productId} />
      <div className="col-span-4 space-y-1">
        <Label className="text-xs">Nazwa</Label>
        <Input name="title" defaultValue={variant.title} aria-invalid={!!errors?.title} required />
        <FieldError message={errors?.title} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">SKU</Label>
        <Input name="sku" defaultValue={variant.sku ?? ""} aria-invalid={!!errors?.sku} />
        <FieldError message={errors?.sku} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Cena (PLN)</Label>
        <Input
          name="price"
          defaultValue={toMajorString(variant.priceAmount)}
          aria-invalid={!!errors?.priceAmount}
          required
        />
        <FieldError message={errors?.priceAmount} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Stan</Label>
        <Input
          name="quantity"
          type="number"
          defaultValue={variant.quantity}
          aria-invalid={!!errors?.quantity}
        />
        <FieldError message={errors?.quantity} />
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "..." : "Zapisz"}
          </Button>
          <Button type="submit" size="sm" variant="ghost" formAction={deleteVariantAction}>
            Usuń
          </Button>
        </div>
        {state?.success && <span className="text-xs text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}

export function AddVariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addVariantAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form
      action={action}
      className="mt-4 grid grid-cols-12 items-start gap-2 rounded-lg border border-dashed p-3"
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="col-span-4 space-y-1">
        <Label className="text-xs">Nazwa</Label>
        <Input name="title" placeholder="np. Rozmiar M" aria-invalid={!!errors?.title} required />
        <FieldError message={errors?.title} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">SKU</Label>
        <Input name="sku" aria-invalid={!!errors?.sku} />
        <FieldError message={errors?.sku} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Cena (PLN)</Label>
        <Input name="price" placeholder="0.00" aria-invalid={!!errors?.priceAmount} required />
        <FieldError message={errors?.priceAmount} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Stan</Label>
        <Input name="quantity" type="number" defaultValue={0} aria-invalid={!!errors?.quantity} />
        <FieldError message={errors?.quantity} />
      </div>
      <div className="col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "Dodaj"}
        </Button>
      </div>
    </form>
  );
}
